// A rule as clean markdown, for `/rules/<ruleId>.md` and `/llms-full.txt`.
// The body is the rule's own markdown, as written in content/rules; the
// header carries what the HTML page shows beside it.

export type RuleDoc = {
  ruleId: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  standardsBasis: string;
  fixOp: string;
  replacement: string;
  /** `YYYY-MM-DD` */
  pubDate: string;
  /** `YYYY-MM-DD`, the later of `pubDate` and the newest commit */
  modified: string;
  body: string;
};

export function ruleMarkdown(rule: RuleDoc, url: string): string {
  const dates = rule.modified === rule.pubDate ? `- Published: ${rule.pubDate}` : `- Published: ${rule.pubDate}; updated: ${rule.modified}`;
  const header = [
    `# ${rule.title}`,
    "",
    `> ${rule.description}`,
    "",
    `- Rule: \`${rule.ruleId}\``,
    `- Verdict: ${rule.status}, ${rule.severity}`,
    `- Standards basis: ${rule.standardsBasis}`,
    `- Autofix: ${rule.fixOp}`,
    `- Instead: ${rule.replacement}`,
    dates,
    `- Page: ${url}`,
    "",
  ];
  return `${header.join("\n")}\n${rule.body.trim()}\n`;
}
