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

function analyse(source: string, compiled: CompiledRules, options: LintOptions): {
  findings: Finding[]; warnings: { line: number; id: string }[];
} {
  const parsed = parseHtml(source);
  const suppressions = parseSuppressions(parsed.comments);
  const findings = runCompiled(compiled, parsed, {
    suppressions,
    ...(options.skipTemplates !== undefined ? { skipTemplates: options.skipTemplates } : {}),
    // Fixes are computed on the --fix path only; anywhere else finding.fix
    // is null and the attrRange lookups are skipped.
    fix: options.fix === true,
  });
  return { findings, warnings: suppressions.ids().filter(({ id }) => !compiled.ruleIds.has(id)) };
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
): { file: string; findings: Finding[]; initialFindings: Finding[]; fixed: number; output: string; warnings: { line: number; id: string }[] } {
  let current = source;
  let fixed = 0;
  let analysis = analyse(current, compiled, options);
  // The playground displays original findings alongside the final fixed text.
  const initialFindings = analysis.findings;

  if (options.fix === true) {
    for (let pass = 0; pass < MAX_FIX_PASSES; pass++) {
      const fixes = analysis.findings
        .map((finding) => finding.fix)
        .filter((fix) => fix !== null);
      if (fixes.length === 0) break;

      const result = applyFixes(current, fixes);
      // No progress: the source this pass saw is still current.
      if (result.applied.length === 0 || result.output === current) break;
      current = result.output;
      fixed += result.applied.length;
      analysis = analyse(current, compiled, options);
    }
  }

  return { file, ...analysis, initialFindings, fixed, output: current };
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
