import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = async (dir: string) =>
  JSON.parse(await readFile(new URL(`../packages/${dir}/package.json`, import.meta.url), "utf8"));

test("both published packages are ESM-only, share one version and the Node floor", async () => {
  const cli = await manifest("cli");
  const plugin = await manifest("eslint-plugin");
  assert.equal(cli.name, "deadhead");
  assert.equal(plugin.name, "eslint-plugin-deadhead");
  assert.equal(cli.version, plugin.version);
  assert.deepEqual(plugin.peerDependencies, { eslint: "^10.0.0" });
  assert.deepEqual(Object.keys(cli.dependencies), ["parse5"]);
  assert.deepEqual(plugin.dependencies, { "@html-eslint/parser": "0.66.1" });
  for (const pkg of [cli, plugin]) {
    assert.equal(pkg.type, "module");
    assert.equal(pkg.main, undefined, "ESM only: no main");
    assert.deepEqual(pkg.exports["."], { types: "./dist/index.d.ts", default: "./dist/index.js" });
    assert.deepEqual(pkg.files, ["dist"]);
    assert.equal(pkg.engines.node, ">=24.8.0");
    assert.equal(pkg.license, "MIT");
    assert.equal(pkg.repository.url, "git+https://github.com/cevdetta/deadhead.git");
    assert.deepEqual(pkg.publishConfig, { access: "public" });
  }
  assert.deepEqual(cli.bin, { deadhead: "./dist/deadhead.js" });
});

test("each package reports its own manifest's name and version", async () => {
  const cli = await manifest("cli");
  const run = spawnSync(process.execPath, ["packages/cli/bin/deadhead.ts", "--version"], { encoding: "utf8" });
  assert.equal(run.stdout.trim(), cli.version);
  const { meta } = await import("../packages/eslint-plugin/index.ts");
  const plugin = await manifest("eslint-plugin");
  assert.deepEqual(meta, { name: plugin.name, version: plugin.version, namespace: "deadhead" });
});

test("the built packages are plain ESM with generated types and a runnable bin", async () => {
  const build = spawnSync(process.execPath, ["scripts/build-packages.ts"], { encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  const read = (file: string) => readFile(new URL(`../packages/${file}`, import.meta.url), "utf8");
  for (const file of ["cli/dist/deadhead.js", "cli/dist/index.js", "cli/dist/worker.js", "eslint-plugin/dist/index.js"]) {
    assert.doesNotMatch(await read(file), /from\s*["'][^"']+\.ts["']/, `${file} imports .ts`);
  }
  assert.match(await read("cli/dist/deadhead.js"), /^#!\/usr\/bin\/env node\n/);
  const cliTypes = await read("cli/dist/index.d.ts");
  assert.match(cliTypes, /defineConfig/);
  assert.match(cliTypes, /DeadheadConfig/);
  const pluginTypes = await read("eslint-plugin/dist/index.d.ts");
  assert.match(pluginTypes, /from "eslint"/);
  assert.match(pluginTypes, /export default |as default\b/);
  // Region comments name source files; import specifiers must not.
  for (const types of [cliTypes, pluginTypes]) {
    assert.doesNotMatch(types, /from\s*["'][^"']*(packages\/|\.ts["'])/, "no repo paths or .ts specifiers in types");
  }
  const run = spawnSync(process.execPath, ["packages/cli/dist/deadhead.js", "--version"], { encoding: "utf8" });
  assert.equal(run.stdout.trim(), (await manifest("cli")).version);
});
