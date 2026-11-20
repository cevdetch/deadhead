// The adapter from an Astro collection entry to `RuleDoc`. Kept apart from
// rule-markdown.ts because `astro:content` resolves inside Astro alone, and
// the root typecheck reaches rule-markdown.ts through its tests.
import type { CollectionEntry } from "astro:content";
import type { RuleDoc } from "./rule-markdown.ts";

const day = (date: Date): string => date.toISOString().slice(0, 10);

/** A collection entry as a `RuleDoc`. */
export const toRuleDoc = (rule: CollectionEntry<"rules">): RuleDoc => {
  const pubDate = day(rule.data.pubDate);
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
    modified: rule.data.updatedDate ? day(rule.data.updatedDate) : pubDate,
    body: rule.body ?? "",
  };
};
