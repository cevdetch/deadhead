#!/usr/bin/env node
/**
 * Install the packed tarballs into an empty ESM project and use them the way
 * a consumer does: the CLI (worker threads and a config file included),
 * ESLint 10 with the plugin, and TypeScript over both packages' types. What
 * this installs is what the release workflow stages.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { packEntries } from "./npm-pack.ts";

const { values } = parseArgs({ options: { out: { type: "string" } } });
const root = process.cwd();
const out = resolve(values.out ?? (await mkdtemp(join(tmpdir(), "dh-tarballs-"))));
await mkdir(out, { recursive: true });
const dir = await mkdtemp(join(tmpdir(), "dh-smoke-"));

const run = (cmd: string, args: string[], cwd = dir) => spawnSync(cmd, args, { cwd, encoding: "utf8" });
const ok = (cmd: string, args: string[], cwd = dir): string => {
  const result = run(cmd, args, cwd);
  assert.equal(result.status, 0, `${cmd} ${args.join(" ")}\n${result.stdout}${result.stderr}`);
  return result.stdout;
};

// Pack exactly what npm would publish.
const tarballs = ["packages/cli", "packages/eslint-plugin"].map((pkg) => {
  const [packed] = packEntries(ok("npm", ["pack", "--json", "--pack-destination", out], resolve(root, pkg)));
  assert.ok(packed, `${pkg}: npm pack listed no package`);
  return join(out, packed.filename);
});

// The consumer uses the ESLint and TypeScript versions this repo tests with.
const devDeps = JSON.parse(await readFile(join(root, "package.json"), "utf8")).devDependencies as Record<string, string>;
const at = (name: string) => `${name}@${devDeps[name]}`;
await writeFile(join(dir, "package.json"), JSON.stringify({ name: "smoke", private: true, type: "module" }));
ok("npm", ["install", "--no-audit", "--no-fund", ...tarballs, at("eslint"), at("typescript")]);

const PAGE =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
  '<meta http-equiv="X-UA-Compatible" content="IE=edge"><title>x</title></head><body></body></html>\n';
const RULE = "meta/http-equiv-x-ua-compatible";
await writeFile(join(dir, "page.html"), PAGE);

type Report = { results: { file: string; findings: { ruleId: string }[] }[] };
const cli = (args: string[]): { status: number | null; report: Report } => {
  const result = run("npx", ["deadhead", "--format=json", ...args]);
  return { status: result.status, report: JSON.parse(result.stdout) as Report };
};

// One page.
const one = cli(["page.html"]);
assert.equal(one.status, 1);
assert.ok(one.report.results[0]?.findings.some((f) => f.ruleId === RULE), "CLI finding");
const version = JSON.parse(await readFile(join(root, "packages/cli/package.json"), "utf8")).version as string;
assert.equal(ok("npx", ["deadhead", "--version"]).trim(), version);

// 64 pages: the CLI switches to worker threads at 64 files, so this loads dist/worker.js.
await mkdir(join(dir, "many"));
for (let i = 0; i < 64; i++) await writeFile(join(dir, "many", `p${i}.html`), PAGE);
const many = cli(["--jobs", "2", "many"]);
assert.equal(many.report.results.flatMap((r) => r.findings).filter((f) => f.ruleId === RULE).length, 64, "worker findings");

// A config file that imports the published package.
await writeFile(join(dir, "deadhead.config.ts"), `import { defineConfig } from "deadhead";\nexport default defineConfig({ rules: { "${RULE}": "off" } });\n`);
const configured = cli(["page.html"]);
assert.ok(!configured.report.results[0]?.findings.some((f) => f.ruleId === RULE), "config turned the rule off");
await writeFile(join(dir, "deadhead.config.ts"), "export default {};\n");

// ESLint 10, flat config. `all`, since the rule on the page is `unnecessary`
// and `recommended` turns on harmful and deprecated rules only.
await writeFile(
  join(dir, "eslint.config.js"),
  'import { defineConfig } from "eslint/config";\nimport deadhead from "eslint-plugin-deadhead";\nexport default defineConfig([deadhead.configs.all]);\n',
);
const eslint = JSON.parse(run("npx", ["eslint", "--format=json", "page.html"]).stdout) as { messages: { ruleId: string }[] }[];
assert.ok(eslint[0]?.messages.some((m) => m.ruleId === `deadhead/${RULE}`), "ESLint finding");

// Types, as a consumer compiles them, under both resolutions an ESM package meets.
await writeFile(
  join(dir, "consumer.ts"),
  [
    'import { defineConfig as deadheadConfig, type DeadheadConfig } from "deadhead";',
    'import { defineConfig } from "eslint/config";',
    'import deadhead from "eslint-plugin-deadhead";',
    'export const cli: DeadheadConfig = deadheadConfig({ failOn: "harmful", rules: { "meta/keywords": "off" } });',
    "export default defineConfig([deadhead.configs.recommended, deadhead.configs.all]);",
    "// @ts-expect-error: not a severity",
    'deadheadConfig({ failOn: "loud" });',
    "",
  ].join("\n"),
);
const compilerOptions = { strict: true, noEmit: true, skipLibCheck: false, target: "esnext", lib: ["esnext"], types: [] };
const tsconfigs = {
  "tsconfig.nodenext.json": { compilerOptions: { ...compilerOptions, module: "nodenext" }, files: ["consumer.ts"] },
  "tsconfig.bundler.json": { compilerOptions: { ...compilerOptions, module: "esnext", moduleResolution: "bundler" }, files: ["consumer.ts"] },
};
for (const [name, config] of Object.entries(tsconfigs)) {
  await writeFile(join(dir, name), JSON.stringify(config));
  ok("npx", ["tsc", "-p", name]);
}

// The scratch project goes; the tarballs stay for whoever stages them.
await rm(dir, { recursive: true, force: true });
process.stdout.write(`✓ smoke: CLI, workers, config, ESLint 10, types (nodenext, bundler). Tarballs in ${out}\n`);
