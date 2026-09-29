// `/llms-full.txt`: every rule's markdown copy in one file, for tools that
// fetch once. A common companion to llms.txt; not part of the proposal.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { modifiedDate, ruleCommitDates } from "../lib/lastmod.ts";
import { toRuleDoc } from "../lib/rule-doc.ts";
import { ruleMarkdown } from "../lib/rule-markdown.ts";

export const GET: APIRoute = async ({ site }) => {
  const committed = ruleCommitDates(process.cwd());
  const rules = (await getCollection("rules")).sort((a, b) => a.data.ruleId.localeCompare(b.data.ruleId));
  const parts = rules.map((rule) =>
    ruleMarkdown(toRuleDoc(rule, committed, modifiedDate), new URL(`/rules/${rule.data.ruleId}`, site).href),
  );
  const head = "# deadhead: every rule\n\n> The full text of every deadhead rule, one after another. Each starts with its own H1.\n\n";
  return new Response(head + parts.join("\n---\n\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
