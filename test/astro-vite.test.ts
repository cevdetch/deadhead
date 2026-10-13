import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { type TestContext } from "node:test";

const siteRequire = createRequire(new URL("../site/package.json", import.meta.url));
const astroManifest = siteRequire.resolve("astro/package.json");
const astroDir = dirname(astroManifest);
const astroCli = join(astroDir, "bin", "astro.mjs");
const plugin = new URL("../packages/cli/vite.ts", import.meta.url).href;
const RULE = "meta/http-equiv-x-ua-compatible";
const MARKER = '\n<script type="module" data-deadhead-report';
const CLEAN = '<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>Astro test</title></head><body><h1>Astro test</h1></body></html>';
const PAGE = CLEAN.replace("<title>", '<meta http-equiv="X-UA-Compatible" content="IE=edge" /><title>');

async function startAstro(t: TestContext, browserConsole = true) {
  const root = await mkdtemp(join(tmpdir(), "dh-astro-"));
  let started = false;
  const cli = (args: string[]): string => {
    const result = spawnSync(process.execPath, [astroCli, ...args], {
      cwd: root,
      encoding: "utf8",
      timeout: 45_000,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    return result.stdout + result.stderr;
  };
  t.after(async () => {
    try {
      if (started) cli(["dev", "stop"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  await mkdir(join(root, "src", "pages"), { recursive: true });
  await mkdir(join(root, "node_modules"));
  await symlink(astroDir, join(root, "node_modules", "astro"), "junction");
  const { version } = JSON.parse(await readFile(astroManifest, "utf8")) as { version: string };
  await writeFile(join(root, "package.json"), JSON.stringify({ type: "module", dependencies: { astro: version } }));
  await writeFile(join(root, "src", "pages", "index.astro"), CLEAN);
  await writeFile(join(root, "src", "pages", "invalid.astro"), PAGE);
  await writeFile(join(root, "astro.config.mjs"), [
    'import { defineConfig } from "astro/config";',
    `import deadhead from ${JSON.stringify(plugin)};`,
    "export default defineConfig({",
    '  cacheDir: "./.astro-cache",',
    `  vite: { cacheDir: "./.vite", plugins: [deadhead({ console: ${browserConsole} })] }`,
    "});",
    "",
  ].join("\n"));
  cli(["dev", "--background", "--host", "127.0.0.1"]);
  started = true;
  const { url } = JSON.parse(await readFile(join(root, ".astro", "dev.json"), "utf8")) as { url: string };
  return { url, logs: () => cli(["dev", "logs"]) };
}

test("Astro vite.plugins reports clean and invalid rendered pages", { timeout: 60_000 }, async (t) => {
  const { url, logs } = await startAstro(t);
  const clean = await fetch(new URL("/", url), { signal: AbortSignal.timeout(30_000) });
  assert.equal(clean.status, 200);
  const cleanHtml = await clean.text();
  assert.equal(cleanHtml.split(MARKER).length, 2);
  assert.doesNotMatch(cleanHtml, new RegExp(RULE));
  assert.match(logs(), /\[deadhead\].*served HTML/);
  assert.match(logs(), /no findings/);

  const response = await fetch(new URL("/invalid", url), { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.equal(html.split(MARKER).length, 2);
  assert.match(html, new RegExp(RULE));
  assert.match(logs(), new RegExp(RULE));
  assert.match(logs(), /https:\/\/deadhead\.cevdet\.ch\/rules\/meta\/http-equiv-x-ua-compatible/);
});

test("Astro console:false reports in the terminal without injecting a report script", { timeout: 60_000 }, async (t) => {
  const { url, logs } = await startAstro(t, false);
  const response = await fetch(new URL("/invalid", url), { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('http-equiv="X-UA-Compatible"'));
  assert.ok(!html.includes("data-deadhead-report"));
  assert.match(logs(), new RegExp(RULE));
});
