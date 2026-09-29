// `/llms.txt` per https://llmstxt.org: H1, summary, then link lists. Rules are
// grouped by namespace and link to their markdown copies; the HTML indexes go
// under "Optional", which the proposal marks as skippable context.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { namespaceBlurbs } from "../vocabulary.ts";

export const GET: APIRoute = async ({ site }) => {
  const at = (path: string) => new URL(path, site).href;
  const rules = (await getCollection("rules")).sort((a, b) => a.data.ruleId.localeCompare(b.data.ruleId));
  const namespaces = [...new Set(rules.map((r) => r.data.ruleId.split("/")[0]!))];
  const lines = [
    "# deadhead",
    "",
    "> A documentation-driven linter for the HTML head: it finds deprecated, unnecessary and harmful markup, and every finding links to a sourced explanation.",
    "",
    "Each rule below is one researched page with at least two sources. The CLI, the browser bookmarklet and the ESLint plugin print the rule's URL with every finding. Rule ids are permanent.",
    "",
    "## Docs",
    "",
    `- [Install and usage](${at("/install")}): the CLI, the bookmarklet and the ESLint plugin`,
    `- [Full text of every rule](${at("/llms-full.txt")}): all rules in one markdown file`,
    "",
  ];
  for (const namespace of namespaces) {
    lines.push(`## ${namespace}/ rules`, "");
    const blurb = namespaceBlurbs[namespace];
    if (blurb) lines.push(blurb, "");
    for (const r of rules.filter((r) => r.data.ruleId.startsWith(`${namespace}/`))) {
      lines.push(`- [${r.data.ruleId}](${at(`/rules/${r.data.ruleId}.md`)}): ${r.data.description}`);
    }
    lines.push("");
  }
  lines.push("## Optional", "", `- [Rules by topic](${at("/topics")})`, `- [Rules by impact](${at("/impacts")})`, "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
