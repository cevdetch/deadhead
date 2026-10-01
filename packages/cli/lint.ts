/**
 * File discovery and per-file linting, kept out of `bin/` so the tests can
 * drive the real thing without spawning a process.
 */

import { glob, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { extname, join, sep } from "node:path";
import { Worker } from "node:worker_threads";

import {
  type CompiledRules,
  type Finding,
  type Rule,
  compile,
  parseSuppressions,
  runCompiled,
} from "../core/index.ts";
import { applyFixes } from "../core/fix.ts";
import { loadRules } from "../rules/load.ts";
import { applySettings, type RuleSetting } from "./config.ts";
import { parseHtml } from "./adapter.ts";
import type { FileResult } from "./reporters/index.ts";

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
  const files = new Set<string>();

  for (const path of paths) {
    if (GLOB.test(path)) {
      let matched = false;
      for await (const entry of glob(path)) {
        matched = true;
        if (!isHtml(entry) || isIgnored(entry)) continue;
        if ((await stat(entry)).isFile()) files.add(entry);
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
      for (const entry of await readdir(path, { recursive: true })) {
        if (!isHtml(entry) || isIgnored(entry)) continue;
        const full = join(path, entry);
        if ((await stat(full)).isFile()) files.add(full);
      }
      continue;
    }
    files.add(path);
  }

  // Sorted so output is identical run to run, and stable across platforms.
  return [...files].sort((a, b) => a.split(sep).join("/").localeCompare(b.split(sep).join("/")));
}

export type LintOptions = { skipTemplates?: boolean; fix?: boolean; headOnly?: boolean };

/**
 * Applying one fix can expose another — removing an element can leave its
 * neighbour newly first in the document — and overlapping fixes are skipped
 * rather than merged, so a second pass picks them up. Bounded, because a rule
 * pair that undoes each other's work must terminate as a stalemate rather than
 * a hang. ESLint uses ten for the same reason.
 */
const MAX_FIX_PASSES = 10;

const analyse = (source: string, compiled: CompiledRules, options: LintOptions) =>
  runCompiled(compiled, parseHtml(source), {
    // Suppression comments are read from the text, not the tree: the port has
    // no comment accessor, and only the source-backed adapters can offer this.
    suppressions: parseSuppressions(source),
    ...(options.skipTemplates !== undefined ? { skipTemplates: options.skipTemplates } : {}),
    // Fixes are computed on the --fix path only; anywhere else finding.fix
    // is null and the attrRange lookups are skipped.
    fix: options.fix === true,
  });

export async function lintFile(
  file: string,
  rules: Rule[],
  options: LintOptions = {},
): Promise<FileResult> {
  return lintFileCompiled(file, compileForRun(rules, options), options);
}

/**
 * Lint one source string: the fix loop and the analysis with no I/O. The
 * `file` names the source in the report; nothing is read or written.
 */
export function lintSource(
  source: string,
  file: string,
  compiled: CompiledRules,
  options: LintOptions,
): { file: string; findings: Finding[]; fixed: number; output: string; warnings: { line: number; id: string }[] } {
  const suppressions = parseSuppressions(source);
  const known = new Set<string>();
  for (const bucket of [compiled.byTag, compiled.byAttr]) {
    for (const entries of bucket.values()) for (const entry of entries) known.add(entry.rule.meta.ruleId);
  }
  for (const entry of compiled.wildcard) known.add(entry.rule.meta.ruleId);
  for (const rule of compiled.documents) known.add(rule.meta.ruleId);
  const warnings = suppressions.ids().filter(({ id }) => !known.has(id));

  let current = source;
  let fixed = 0;
  // Findings from the latest fix pass, reused as the report when the loop
  // stabilises on the current source. Analysing is deterministic, so a pass
  // that already saw these exact bytes returns these exact findings — parsing
  // the same text again would only repeat the work.
  let stable: Finding[] | null = null;

  if (options.fix === true) {
    for (let pass = 0; pass < MAX_FIX_PASSES; pass++) {
      const findings = analyse(current, compiled, options);
      const fixes = findings
        .map((finding) => finding.fix)
        .filter((fix) => fix !== null);
      // Nothing left to fix: this pass already parsed the final source.
      if (fixes.length === 0) {
        stable = findings;
        break;
      }

      const result = applyFixes(current, fixes);
      // No progress: the source this pass saw is still current.
      if (result.applied.length === 0 || result.output === current) {
        stable = findings;
        break;
      }
      current = result.output;
      fixed += result.applied.length;
    }
  }

  // `stable` is set exactly when the last fix pass ran on the current source.
  // It stays null when the loop exhausted its passes while still changing the
  // file (or never ran), and then one final analyse reports what is left.
  return { file, findings: stable ?? analyse(current, compiled, options), fixed, output: current, warnings };
}

async function lintFileCompiled(
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
  for (const file of files) results.push(await lintFileCompiled(file, compiled, options));
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
  const slices: string[][] = Array.from({ length: jobs }, () => []);
  files.forEach((file, i) => slices[i % jobs]!.push(file));
  // The worker sits next to this module: worker.ts in the repo, worker.js in
  // the published bundle. A computed specifier keeps the bundler from
  // treating it as an asset to copy.
  const workerUrl = new URL(import.meta.url.endsWith(".ts") ? "./worker.ts" : "./worker.js", import.meta.url);
  const parts = await Promise.all(
    slices.filter((s) => s.length > 0).map(
      (slice) =>
        new Promise<FileResult[]>((resolve, reject) => {
          const worker = new Worker(workerUrl);
          worker.once("message", (results: FileResult[]) => {
            void worker.terminate();
            resolve(results);
          });
          worker.once("error", reject);
          worker.postMessage({ files: slice, settings, options });
        }),
    ),
  );
  const byFile = new Map(parts.flat().map((r) => [r.file, r]));
  const compiled = compileForRun(applySettings(await loadRules(), settings), options);
  return { results: files.map((f) => byFile.get(f)!), visitBody: compiled.visitBody };
}

/**
 * Compile for a run, honouring the head-only opt-out. `compile()` skips the
 * `<body>` walk when no active rule is scoped beyond `<head>`; `--no-head-only`
 * forces the walk anyway. Findings are unchanged either way — document rules
 * query the whole tree regardless — it only costs the walk.
 */
export const compileForRun = (rules: Rule[], options: LintOptions): CompiledRules => {
  const compiled = compile(rules);
  if (options.headOnly === false) compiled.visitBody = true;
  return compiled;
};
