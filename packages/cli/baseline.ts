/**
 * A baseline: the findings a project has decided to live with for now, so CI
 * fails on new ones without demanding the backlog be fixed first.
 *
 * Entries are a count per file per rule — not line numbers, not hashes of the
 * surrounding source. Both of those rot: reindenting a file, or adding an
 * unrelated element above, would invalidate every entry below it and light up
 * CI with findings nobody introduced. A count survives every edit that does not
 * change how many times a rule fires, which is the property that matters.
 *
 * The cost is honest: a baseline of 3 will absorb a *different* third finding
 * of the same rule in the same file. That is the same trade ESLint's bulk
 * suppressions make, and it beats a baseline nobody trusts.
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import type { Finding } from "../core/types.ts";
import type { FileResult } from "./reporters/index.ts";

export type Baseline = {
  version: 1;
  /** file → ruleId → number of accepted findings. */
  entries: Record<string, Record<string, number>>;
};

export class BaselineError extends Error {}

export async function readBaseline(path: string): Promise<Baseline> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new BaselineError(`no such baseline file: ${path} (create it with --update-baseline)`);
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BaselineError(`${path}: not valid JSON`);
  }

  function assertBaseline(value: unknown): asserts value is Baseline {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new BaselineError(`${path}: not a deadhead baseline (expected { version: 1, entries })`);
    }
    if (!("version" in value) || !("entries" in value)) {
      throw new BaselineError(`${path}: not a deadhead baseline (expected { version: 1, entries })`);
    }
    if (value.version !== 1 || typeof value.entries !== "object" || value.entries === null || Array.isArray(value.entries)) {
      throw new BaselineError(`${path}: not a deadhead baseline (expected { version: 1, entries })`);
    }
    for (const [file, perRule] of Object.entries(value.entries)) {
      if (typeof perRule !== "object" || perRule === null || Array.isArray(perRule)) {
        throw new BaselineError(`${path}: entry for ${JSON.stringify(file)} must map ruleIds to counts`);
      }
      for (const [ruleId, count] of Object.entries(perRule)) {
        if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
          throw new BaselineError(
            `${path}: entry ${JSON.stringify(file)} → ${JSON.stringify(ruleId)} must be a non-negative safe integer`,
          );
        }
      }
    }
  }

  assertBaseline(parsed);
  return { version: 1, entries: parsed.entries };
}

/** Baseline keys are POSIX paths relative to the baseline file's directory. */
const key = (file: string, baseDir: string, cwd: string = process.cwd()): string =>
  relative(baseDir, resolve(cwd, file)).split(sep).join("/");

/** Counts for one lint run, in the baseline's own shape. */
export function summarise(results: FileResult[], baseDir: string = process.cwd()): Baseline {
  const entries: Record<string, Record<string, number>> = {};
  for (const { file, findings } of results) {
    if (findings.length === 0) continue;
    const perRule: Record<string, number> = {};
    for (const finding of findings) {
      perRule[finding.ruleId] = (perRule[finding.ruleId] ?? 0) + 1;
    }
    // Sorted so the file is stable in version control and diffs stay readable.
    entries[key(file, baseDir)] = Object.fromEntries(Object.entries(perRule).sort(([a], [b]) => a.localeCompare(b)));
  }
  return {
    version: 1,
    entries: Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export async function writeBaseline(path: string, baseline: Baseline): Promise<void> {
  await writeFile(path, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
}

export type Applied = {
  /** What is left after the baseline absorbs what it accounts for. */
  results: FileResult[];
  /** Findings the baseline expected that are no longer there. */
  resolved: number;
};

/**
 * Subtract the baseline from a run.
 *
 * Findings are dropped in document order, so what survives is the *last*
 * occurrence rather than an arbitrary one — the position is approximate by
 * construction, and a stable choice at least keeps output deterministic.
 */
export function applyBaseline(
  results: FileResult[],
  baseline: Baseline,
  baseDir: string = process.cwd(),
  cwd: string = process.cwd(),
): Applied {
  const out: FileResult[] = [];
  let accountedFor = 0;

  for (const result of results) {
    const allowance = { ...(baseline.entries[key(result.file, baseDir, cwd)] ?? {}) };
    const kept: Finding[] = [];

    for (const finding of result.findings) {
      const remaining = allowance[finding.ruleId] ?? 0;
      if (remaining > 0) {
        allowance[finding.ruleId] = remaining - 1;
        accountedFor++;
        continue;
      }
      kept.push(finding);
    }
    out.push({ ...result, findings: kept });
  }

  let expected = 0;
  for (const perRule of Object.values(baseline.entries)) {
    for (const count of Object.values(perRule)) expected += count;
  }

  return { results: out, resolved: Math.max(0, expected - accountedFor) };
}
