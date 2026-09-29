import assert from "node:assert/strict";
import test from "node:test";

import { ruleMarkdown } from "../site/src/lib/rule-markdown.ts";

const rule = {
  ruleId: "meta/keywords",
  title: '<meta name="keywords">',
  description: "Google has ignored the keywords meta tag since 2009.",
  severity: "unnecessary",
  status: "avoid",
  standardsBasis: "vendor",
  fixOp: "remove-element",
  replacement: "Delete it.",
  pubDate: "2026-09-09",
  modified: "2026-09-21",
  body: "Intro paragraph.\n\n## Why avoid\n\nBecause.\n",
};

test("ruleMarkdown opens with the title, the summary and the facts, then the body verbatim", () => {
  const md = ruleMarkdown(rule, "https://deadhead.cevdet.ch/rules/meta/keywords");
  assert.equal(
    md,
    [
      '# <meta name="keywords">',
      "",
      "> Google has ignored the keywords meta tag since 2009.",
      "",
      "- Rule: `meta/keywords`",
      "- Verdict: avoid, unnecessary",
      "- Standards basis: vendor",
      "- Autofix: remove-element",
      "- Instead: Delete it.",
      "- Published: 2026-09-09; updated: 2026-09-21",
      "- Page: https://deadhead.cevdet.ch/rules/meta/keywords",
      "",
      "Intro paragraph.",
      "",
      "## Why avoid",
      "",
      "Because.",
      "",
    ].join("\n"),
  );
});

test("ruleMarkdown leaves out the update date when it equals the publication date", () => {
  const md = ruleMarkdown({ ...rule, modified: rule.pubDate }, "https://example.com/r");
  assert.match(md, /^- Published: 2026-09-09$/m);
});
