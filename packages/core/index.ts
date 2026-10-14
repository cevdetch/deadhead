/**
 * `@deadhead/core` — the port, the selector subset, the walker and the engine.
 *
 * Zero runtime dependencies, by rule. This has to run unbundled in Node and
 * inlined into a bookmarklet, and a linter that complains about dead weight
 * cannot ship a dependency tree.
 */

export { compile, run, runCompiled, type CompiledRules, type Rule, type RunOptions } from "./engine.ts";
export { applyFixes, computeFix, type ApplyResult, type Fix } from "./fix.ts";
export {
  NO_SUPPRESSIONS,
  parseSuppressions,
  type Suppressions,
} from "./suppressions.ts";
export {
  leadingTag,
  matches,
  parseSelector,
  type AttrSel,
  type Compound,
  type NotSel,
  type Simple,
  type TagSel,
} from "./selector.ts";
export { makeDoctypePort, withPortCache } from "./port.ts";
export { walk, type Region, type WalkOptions } from "./walker.ts";
export type {
  CheckFn,
  DoctypePort,
  DocumentPort,
  ElementPort,
  Finding,
  Loc,
  MatchFn,
  Parsed,
  Range,
  RuleContext,
  SourceComment,
} from "./types.ts";
export {
  SEVERITY_RANK,
  ruleUrl,
  type Detectability,
  type FixOp,
  type Kind,
  type RuleMeta,
  type Scope,
  type Severity,
  type Status,
} from "./vocabulary.ts";
