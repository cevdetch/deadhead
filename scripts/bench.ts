#!/usr/bin/env node
/**
 * Benchmarks for the claims performance PRs make. In-process, so parse and
 * engine time are measured without process start-up noise; start-up is its own
 * scenario. Median of 7 after one warm-up run.
 */

import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";

import { collectFiles, lintFiles, lintFilesParallel } from "../packages/cli/lint.ts";
import { loadRules } from "../packages/rules/load.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { eslint: { type: "boolean", default: false }, synthetic: { type: "boolean", default: false }, jobs: { type: "string", default: "1" } },
});

const RUNS = 7;
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

async function time(scenario: string, files: number, fn: () => Promise<unknown>): Promise<void> {
  await fn();
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const started = performance.now();
    await fn();
    times.push(performance.now() - started);
  }
  const rssMb = Math.round(process.memoryUsage().rss / 1e6);
  process.stdout.write(`${JSON.stringify({ scenario, files, medianMs: Math.round(median(times)), minMs: Math.round(Math.min(...times)), rssMb })}\n`);
}

const rules = await loadRules();
const target = positionals[0] ?? "site/dist";
const files = await collectFiles([target]);
const jobs = Number(values.jobs);
if (!Number.isSafeInteger(jobs) || jobs < 1) throw new RangeError("--jobs must be a positive safe integer");
await time(`cli:${target}${jobs === 1 ? "" : `:jobs=${jobs}`}`, files.length,
  () => jobs === 1 ? lintFiles(files, rules) : lintFilesParallel(files, {}, {}, jobs));

const coldTimes: number[] = [];
for (let i = 0; i < RUNS; i++) {
  const started = performance.now();
  const result = spawnSync(process.execPath, ["packages/cli/bin/deadhead.ts", "test/fixtures/head/title/valid.html"], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`cold-start CLI failed: ${result.stderr}`);
  coldTimes.push(performance.now() - started);
}
process.stdout.write(`${JSON.stringify({ scenario: "cli:cold-start", files: 1, medianMs: Math.round(median(coldTimes)) })}\n`);

if (values.synthetic) {
  const dir = await mkdtemp(join(tmpdir(), "dh-bench-"));
  const file = join(dir, "big.html");
  const svg = '<svg viewBox="0 0 24 24"><g><path d="M0 0h24v24H0z"/><circle cx="12" cy="12" r="4"/></g></svg>';
  const row = `<div class="row"><p align="left">x</p><a href="/a" rel="nofollow">a</a>${svg}</div>`;
  try {
    await writeFile(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>b</title></head><body>${row.repeat(20_000)}</body></html>`);
    await time("cli:synthetic-5mb", 1, () => lintFiles([file], rules));
  } finally { await rm(dir, { recursive: true, force: true }); }
}

if (values.eslint) {
  const { ESLint } = await import("eslint");
  const plugin = (await import("../packages/eslint-plugin/index.ts")).default;
  const parser = await import("@html-eslint/parser");
  const lint = (config: Record<string, unknown>) => async () =>
    new ESLint({ overrideConfigFile: true, overrideConfig: [{ files: ["**/*.html"], languageOptions: { parser }, ...config }] }).lintFiles(files);
  await time("eslint:parser-only", files.length, lint({}));
  await time("eslint:all", files.length, lint({ plugins: { deadhead: plugin }, rules: plugin.configs.all.rules }));
}
