// The adapter from an Astro collection entry to `RuleDoc`. Kept apart from
// rule-markdown.ts because `astro:content` resolves inside Astro alone, and
// the root typecheck reaches rule-markdown.ts through its tests.
import type { CollectionEntry } from "astro:content";
import type { RuleDoc } from "./rule-markdown.ts";

/** A collection entry as a `RuleDoc`, dated with the git commit map from `ruleCommitDates`. */
export const toRuleDoc = (rule: CollectionEntry<"rules">, committed: Map<string, string>, modifiedDate: (p: string, c: string | undefined) => string): RuleDoc => {
  const pubDate = rule.data.pubDate.toISOString().slice(0, 10);
  return {
    ruleId: rule.data.ruleId,
    title: rule.data.title,
    description: rule.data.description,
    severity: rule.data.severity,
    status: rule.data.status,
    standardsBasis: rule.data.standardsBasis,
    fixOp: rule.data.fix.op,
    replacement: rule.data.replacement,
    pubDate,
    modified: modifiedDate(pubDate, committed.get(rule.data.ruleId)),
    body: rule.body ?? "",
  };
};
