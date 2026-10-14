/**
 * File discovery and per-file linting, kept out of `bin/` so the tests can
 * drive the real thing without spawning a process.
 */

import { glob, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { extname, join, resolve, sep } from "node:path";

import type { CompiledRules, Rule } from "../core/index.ts";
import { loadRules } from "../rules/load.ts";
import { applySettings, type RuleSetting } from "./config.ts";
import type { FileResult } from "./reporters/index.ts";
import { compileForRun, lintSource, type LintOptions } from "./source.ts";
import { runWorkerJobs } from "./worker-jobs.ts";

// The per-source lint path lives in source.ts, which the try page bundles for the browser.
export { compileForRun, lintSource, type LintOptions } from "./source.ts";

const HTML = new Set([".html", ".htm"]);
const GLOB = /[*?[\]{}]/;

export class UsageError extends Error {}

const isHtml = (path: string): boolean => HTML.has(extname(path).toLowerCase());

/**
 * Never walk into these. Pointing the linter at `.` should not spend a minute
 * on `node_modules`, and a dot-directory is somebody's tooling, not their site.
 */
const isIgnored = (relative: string): boolean =>
  relative
    .split(/[\\/]/)
    .some((segment) => segment === "node_modules" || (segment.startsWith(".") && segment !== "."));

/**
 * Expand arguments into HTML files.
 *
 * Three shapes, with deliberately different rules:
 *
 * - a glob is expanded here rather than by the shell, so `check:self` behaves
 *   the same on Windows, where the shell would hand the pattern through
 *   verbatim. `fs.glob` is the platform's, so this costs no dependency.
 * - a directory is walked recursively for `.html`/`.htm`.
 * - an explicit file path is linted whatever it is called. If you named it,
 *   you meant it.
 */
export async function collectFiles(paths: string[]): Promise<string[]> {
  const files = new Map<string, string>();
  const add = (file: string): void => {
    const absolute = resolve(file);
    if (!files.has(absolute)) files.set(absolute, file);
  };

  for (const path of paths) {
    if (GLOB.test(path)) {
      let matched = false;
      for await (const entry of glob(path, { exclude: isIgnored })) {
        matched = true;
        if (!isHtml(entry) || isIgnored(entry)) continue;
        if ((await stat(entry)).isFile()) add(entry);
      }
      if (!matched) throw new UsageError(`no files matched: ${path}`);
      continue;
    }

    let info;
    try {
      info = await stat(path);
    } catch {
      throw new UsageError(`no such file or directory: ${path}`);
    }

    if (info.isDirectory()) {
      const directories = [path];
      while (directories.length > 0) {
        const directory = directories.pop()!;
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          if (isIgnored(entry.name)) continue;
          const full = join(directory, entry.name);
          if (entry.isDirectory()) directories.push(full);
          else if (isHtml(entry.name) && (entry.isFile() || (entry.isSymbolicLink() && (await stat(full)).isFile()))) add(full);
        }
      }
      continue;
    }
    add(path);
  }

  // Sorted so output is identical run to run, and stable across platforms.
  return [...files.values()].sort((a, b) => a.split(sep).join("/").localeCompare(b.split(sep).join("/")));
}

async function lintFile(
  file: string,
  compiled: CompiledRules,
  options: LintOptions,
): Promise<FileResult> {
  const original = await readFile(file, "utf8");
  const linted = lintSource(original, file, compiled, options);
  // Only touch the file if something changed, so `--fix` on a clean tree
  // does not rewrite every mtime and invalidate every build cache.
  if (linted.output !== original) await writeFile(file, linted.output, "utf8");
  return { file, findings: linted.findings, fixed: linted.fixed, warnings: linted.warnings };
}

export async function lintFiles(
  files: string[],
  rules: Rule[],
  options: LintOptions = {},
): Promise<{ results: FileResult[]; visitBody: boolean }> {
  // Compile once for the whole run: selectors and buckets do not depend on
  // the file, and --fix re-analyses the same file up to MAX_FIX_PASSES times.
  const compiled = compileForRun(rules, options);
  const results: FileResult[] = [];
  for (const file of files) results.push(await lintFile(file, compiled, options));
  return { results, visitBody: compiled.visitBody };
}

export const defaultJobs = (): number => Math.max(1, Math.min(availableParallelism() - 1, 8));

/** Round-robin files across workers; results are put back in input order. */
export async function lintFilesParallel(
  files: string[],
  settings: Record<string, RuleSetting>,
  options: LintOptions,
  jobs: number,
): Promise<{ results: FileResult[]; visitBody: boolean }> {
  if (!Number.isSafeInteger(jobs) || jobs < 1) throw new UsageError("jobs must be a positive safe integer");
  const count = Math.min(jobs, files.length, availableParallelism());
  const slices: string[][] = Array.from({ length: count }, () => []);
  files.forEach((file, i) => slices[i % count]!.push(file));
  // The worker sits next to this module: worker.ts in the repo, worker.js in
  // the published bundle. A computed specifier keeps the bundler from
  // treating it as an asset to copy.
  const workerUrl = new URL(import.meta.url.endsWith(".ts") ? "./worker.ts" : "./worker.js", import.meta.url);
  const parts = await runWorkerJobs(
    workerUrl,
    slices.map(files => ({ files, settings, options })),
  );
  const byFile = new Map(parts.flat().map((r) => [r.file, r]));
  const rules = applySettings(await loadRules(), settings);
  const visitBody = options.headOnly === false || rules.some(rule => rule.meta.kind === "element" && rule.meta.scope !== "head");
  return { results: files.map((f) => byFile.get(f)!), visitBody };
}

