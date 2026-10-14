import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { readBaseline } from "../packages/cli/baseline.ts";
import { lintFiles, lintFilesParallel } from "../packages/cli/lint.ts";
import { loadRules } from "../packages/rules/load.ts";

const BIN = new URL("../packages/cli/bin/deadhead.ts", import.meta.url);
const CLEAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page</title></head><body></body></html>\n';
const DIRTY = CLEAN.replace("</head>", '<meta name="keywords" content="example"></head>');

async function sandbox(run: (dir: string, file: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "dh-cli-hardening-"));
  const file = join(dir, "page.html");
  try { await writeFile(file, DIRTY); await run(dir, file); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

const cli = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [BIN.pathname, ...args], {
  cwd, encoding: "utf8", timeout: 10_000,
});

test("JSON and SARIF remain parseable when --fix writes a file", async () => {
  await sandbox(async (dir, file) => {
    for (const format of ["json", "sarif"]) {
      await writeFile(file, DIRTY);
      const result = cli(dir, `--format=${format}`, "--fix", file);
      assert.equal(result.status, 0, result.stderr);
      assert.doesNotThrow(() => JSON.parse(result.stdout));
      assert.match(result.stderr, /fixed 1 finding/);
      assert.equal(await readFile(file, "utf8"), CLEAN);
    }
  });
});

test("invalid baseline invocations fail before --fix changes source", async () => {
  await sandbox(async (dir, file) => {
    await writeFile(join(dir, "bad.json"), '{"version":1,"entries":[]}');
    for (const args of [
      ["--update-baseline"], ["--baseline=missing.json"], ["--baseline=bad.json"],
    ]) {
      const result = cli(dir, "--fix", ...args, file);
      assert.equal(result.status, 2, args.join(" "));
      assert.match(result.stderr, /baseline/);
      assert.equal(await readFile(file, "utf8"), DIRTY);
    }
  });
});

test("inherited object names are invalid reporter names", async () => {
  await sandbox(async (dir, file) => {
    for (const format of ["toString", "constructor", "__proto__"]) {
      const result = cli(dir, `--format=${format}`, "--fix", file);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /unknown --format/);
      assert.equal(result.stdout, "");
      assert.equal(await readFile(file, "utf8"), DIRTY);
    }
  });
});

test("baseline entries are records and counts are safe integers", async () => {
  await sandbox(async (dir) => {
    for (const entries of [[], { "page.html": [] }, { "page.html": { "meta/keywords": Number.MAX_SAFE_INTEGER + 1 } }]) {
      const file = join(dir, "baseline.json");
      await writeFile(file, JSON.stringify({ version: 1, entries }));
      await assert.rejects(readBaseline(file), /baseline|map ruleIds|integer/);
    }
  });
});

test("pruned baseline notices do not corrupt a JSON report", async () => {
  await sandbox(async (dir, file) => {
    await writeFile(file, CLEAN);
    await writeFile(join(dir, "baseline.json"), '{"version":1,"entries":{"page.html":{"meta/keywords":1}}}');
    const result = cli(dir, "--format=json", "--baseline=baseline.json", file);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotThrow(() => JSON.parse(result.stdout));
    assert.match(result.stderr, /1 baseline entry is no longer needed/);
  });
});

test("large worker requests remain bounded and preserve the serial report", async () => {
  await sandbox(async (dir, first) => {
    const second = join(dir, "other.html");
    await writeFile(second, CLEAN);
    const files = [first, second];
    assert.deepEqual(await lintFilesParallel(files, {}, {}, Number.MAX_SAFE_INTEGER), await lintFiles(files, await loadRules()));
    await assert.rejects(lintFilesParallel([], {}, {}, 0), /positive safe integer/);
  });
});
