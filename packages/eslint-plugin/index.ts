/**
 * `eslint-plugin-deadhead`.
 *
 * One ESLint rule per deadhead rule, named with the `ruleId` verbatim:
 *
 *     rules: { "deadhead/meta/http-equiv-x-ua-compatible": "error" }
 *
 * ESLint splits an unscoped rule id on the *first* slash, so the plugin is
 * `deadhead` and the rule name keeps its own slash. That matters more than it
 * looks: `ruleId` is permanent and users write suppression comments and CI
 * baselines against it, so the ESLint config, the CLI output and the markdown
 * all say the same string. Rewriting `meta/x` to `meta-x` here would create a
 * second name for the same thing.
 *
 * Deliberately the last runtime to be built. For framework users the head tags
 * often live in JSX, Vue or Svelte where an HTML parser never sees them, so
 * this is a convenience — the bookmarklet inspects rendered output, which is
 * the ground truth.
 */

import * as htmlParser from "@html-eslint/parser";
import type { ESLint, Linter, Rule } from "eslint";
import manifest from "./package.json" with { type: "json" };

import { type CompiledRules, compile, runCompiled } from "../core/engine.ts";
import { parseSuppressions } from "../core/suppressions.ts";
import type { Rule as DeadheadRule } from "../core/engine.ts";
import type { Finding } from "../core/types.ts";
import { ruleUrl } from "../core/vocabulary.ts";
import { RULES as loaded } from "../rules/registry.gen.ts";
import { fromProgram } from "./adapter.ts";


/**
 * A fix is offered only when the engine produced one. It is `null` for
 * `fix: { op: "none" }`, for every `detectability: "partial"` rule and for a
 * finding the rule's `fixable()` vetoes, so ESLint is never handed an edit the
 * CLI would refuse to make.
 */
const fixDescriptor = (
  fix: Finding["fix"],
): { fix?: (fixer: Rule.RuleFixer) => Rule.Fix } =>
  fix === null
    ? {}
    : { fix: (fixer: Rule.RuleFixer) => fixer.replaceTextRange([fix.range[0], fix.range[1]], fix.text) };

/**
 * `harmful` is a problem; the rest are suggestions. ESLint's `type` drives
 * editor presentation, not severity — severity is the user's config to set.
 */
const eslintType = (rule: DeadheadRule): "problem" | "suggestion" =>
  rule.meta.severity === "harmful" ? "problem" : "suggestion";

/** One run per file: the rules enabled for it, and their findings once computed. */
type FileRun = { requested: Set<string>; findings: Map<string, Finding[]> | null };
const perFile = new WeakMap<object, FileRun>();
/** Compiled rule subsets, reused across files with the same enabled set. */
const compiledBySet = new Map<string, CompiledRules>();
let passes = 0;

function findingsFor(run: FileRun, program: unknown, source: string): Map<string, Finding[]> {
  if (run.findings !== null) return run.findings;
  const key = [...run.requested].sort().join("\n");
  let compiled = compiledBySet.get(key);
  if (compiled === undefined) {
    compiled = compile(loaded.filter((rule) => run.requested.has(rule.meta.ruleId)));
    compiledBySet.set(key, compiled);
  }
  passes++;
  const grouped = new Map<string, Finding[]>();
  for (const finding of runCompiled(compiled, fromProgram(program, source), { suppressions: parseSuppressions(source), fix: true })) {
    (grouped.get(finding.ruleId) ?? grouped.set(finding.ruleId, []).get(finding.ruleId)!).push(finding);
  }
  run.findings = grouped;
  return grouped;
}

function toEslintRule(rule: DeadheadRule): Rule.RuleModule {
  return {
    meta: {
      type: eslintType(rule),
      // Autofix comes free: the project's fixes are already range-based text
      // edits, which is exactly what an ESLint fixer is. Declared only when the
      // rule actually has an op — claiming `fixable` and never fixing makes
      // `--fix` report work it did not do.
      ...(rule.meta.fix.op === "none" ? {} : { fixable: "code" as const }),
      docs: {
        description: rule.meta.description,
        url: ruleUrl(rule.meta.ruleId),
      },
      schema: [],
      messages: {
        // `detail` is optional, so it is passed as an empty string when absent
        // rather than making a second message id.
        finding: "{{message}} {{replacement}}{{detail}}",
      },
    },

    create(context) {
      // ESLint calls create() for every enabled rule before it traverses, with
      // one SourceCode object per file: register here, run once in Program.
      const key = context.sourceCode as unknown as object;
      let run = perFile.get(key);
      if (run === undefined) {
        run = { requested: new Set(), findings: null };
        perFile.set(key, run);
      }
      run.requested.add(rule.meta.ruleId);
      const fileRun = run;
      return {
        Program(node) {
          const findings = findingsFor(fileRun, node, context.sourceCode.getText()).get(rule.meta.ruleId) ?? [];
          for (const finding of findings) {
            const range = finding.range;
            const start =
              range === null
                ? { line: finding.loc?.line ?? 1, column: (finding.loc?.col ?? 1) - 1 }
                : context.sourceCode.getLocFromIndex(range[0]);
            const end = range === null ? start : context.sourceCode.getLocFromIndex(range[1]);

            context.report({
              loc: { start, end },
              messageId: "finding",
              data: {
                message: finding.message,
                replacement: finding.replacement,
                detail: finding.detail === undefined ? "" : ` (${finding.detail})`,
              },
              ...fixDescriptor(finding.fix),
            });
          }
        },
      };
    },
  };
}

export const rules: Record<string, Rule.RuleModule> = Object.fromEntries(
  loaded.map((rule) => [rule.meta.ruleId, toEslintRule(rule)]),
);

/** `namespace` is the prefix users type: `deadhead/meta/keywords`. */
export const meta: { name: string; version: string; namespace: string } = {
  name: manifest.name,
  version: manifest.version,
  namespace: "deadhead",
};

const levels = (list: DeadheadRule[]): Record<string, "error" | "warn"> =>
  Object.fromEntries(list.map((r) => [`deadhead/${r.meta.ruleId}`, r.meta.severity === "harmful" ? "error" : "warn"]));


/** Test hook: engine passes so far. Not part of the public API. */
export const __passes = (): number => passes;

type Presets = { recommended: Linter.Config; all: Linter.Config };
type DeadheadPlugin = ESLint.Plugin & { configs: Presets };

const plugin: DeadheadPlugin = {
  meta,
  rules,
  configs: {} as Presets,
};

const preset = (name: string, list: DeadheadRule[]): Linter.Config => ({
  name: `deadhead/${name}`,
  files: ["**/*.html"],
  plugins: { deadhead: plugin },
  languageOptions: { parser: htmlParser },
  rules: levels(list),
});

plugin.configs.recommended = preset("recommended", loaded.filter((r) => r.meta.severity !== "unnecessary"));
plugin.configs.all = preset("all", loaded);
export const configs: Presets = plugin.configs;
export default plugin;
