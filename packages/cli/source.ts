/**
 * Lint one source string: parse with parse5, run the rules, apply fixes. No
 * file system, no workers, no `node:` import, so the try page on the docs site
 * bundles it for the browser and gets the CLI's exact findings and fixes.
 * `lint.ts` re-exports everything here for the CLI.
 */

import { type CompiledRules, type Finding, type Rule, compile, parseSuppressions, runCompiled } from "../core/index.ts";
import { applyFixes } from "../core/fix.ts";
import { parseHtml } from "./adapter.ts";

export type LintOptions = { skipTemplates?: boolean; fix?: boolean; headOnly?: boolean };

/**
 * Applying one fix can expose another — removing an element can leave its
 * neighbour newly first in the document — and overlapping fixes are skipped
 * rather than merged, so a second pass picks them up. Bounded, because a rule
 * pair that undoes each other's work must terminate as a stalemate rather than
 * a hang. ESLint uses ten for the same reason.
 */
const MAX_FIX_PASSES = 10;

/** One analysis pass. With `fix: true` each finding carries the edit that removes it. */
export const analyseSource = (source: string, compiled: CompiledRules, options: LintOptions): Finding[] =>
  runCompiled(compiled, parseHtml(source), {
    // Suppression comments are read from the text, not the tree: the port has
    // no comment accessor, and only the source-backed adapters can offer this.
    suppressions: parseSuppressions(source),
    ...(options.skipTemplates !== undefined ? { skipTemplates: options.skipTemplates } : {}),
    // Fixes are computed on the --fix path only; anywhere else finding.fix
    // is null and the attrRange lookups are skipped.
    fix: options.fix === true,
  });

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
      const findings = analyseSource(current, compiled, options);
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
  return { file, findings: stable ?? analyseSource(current, compiled, options), fixed, output: current, warnings };
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
