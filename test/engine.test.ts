import assert from "node:assert/strict";
import test from "node:test";

import { type Rule, run } from "../packages/core/engine.ts";
import { parseSuppressions } from "../packages/core/suppressions.ts";
import type { Finding, RuleMeta } from "../packages/core/index.ts";
import { parseHtml } from "../packages/cli/adapter.ts";
import { parseForESLint } from "@html-eslint/parser";
import { fromProgram } from "../packages/eslint-plugin/adapter.ts";

/**
 * The engine is exercised through the real parse5 adapter rather than a hand
 * built tree: a stub that agrees with the engine but not with a parser proves
 * nothing, and this is the path the CLI actually takes.
 */
const meta = (overrides: Partial<RuleMeta> & { ruleId: string }): RuleMeta => ({
  title: "Test rule",
  description: "A description.",
  pubDate: "2026-01-01",
  status: "avoid",
  severity: "unnecessary",
  standardsBasis: "spec",
  detectability: "yes",
  kind: "element",
  scope: "any",
  selector: null,
  match: null,
  fix: { op: "none", attr: null, token: null },
  replacement: "Delete it.",
  tags: [],
  impacts: [],
  related: [],
  ...overrides,
});

const lint = (html: string, rules: Rule[], suppress = false): Finding[] =>
  run(rules, parseHtml(html), suppress ? { suppressions: parseSuppressions(html) } : {});

/** A fragment through @html-eslint/parser, which builds exactly what was written. */
const lintAsWritten = (html: string, rules: Rule[]): Finding[] =>
  run(rules, fromProgram(parseForESLint(html, {}).ast, html));

const doc = (head: string, body = ""): string =>
  `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

const ids = (findings: Finding[]): string[] => findings.map((f) => f.ruleId);

test("a selector-only rule reports every match", () => {
  const rule: Rule = { meta: meta({ ruleId: "meta/x", selector: "meta[name]" }) };
  const findings = lint(doc('<meta name="a">\n<meta name="b">\n<meta charset="utf-8">'), [rule]);
  assert.equal(findings.length, 2);
  assert.deepEqual(ids(findings), ["meta/x", "meta/x"]);
});

test("scope confines a rule to one half of the document", () => {
  const html = doc('<script src="/h.js"></script>', '<script src="/b.js"></script>');
  const rules = (scope: RuleMeta["scope"]): Rule[] => [
    { meta: meta({ ruleId: "script/s", selector: "script", scope }) },
  ];
  assert.equal(lint(html, rules("head")).length, 1);
  assert.equal(lint(html, rules("body")).length, 1);
  assert.equal(lint(html, rules("any")).length, 2);
  assert.equal(lint(html, rules("head"))[0]?.loc?.line, 4);
  assert.equal(lint(html, rules("body"))[0]?.loc?.line, 7);
});

test("a rule whose selector has no leading tag still matches, via its attribute bucket", () => {
  const rule: Rule = { meta: meta({ ruleId: "attr/any", selector: "[data-legacy]" }) };
  const findings = lint(doc('<meta data-legacy="1">', '<div data-legacy="1"></div>'), [rule]);
  assert.equal(findings.length, 2);
});

test("match: logic refines the selector rather than replacing it", () => {
  const seen: string[] = [];
  const rule: Rule = {
    meta: meta({ ruleId: "script/typed", selector: "script[type]", match: "logic" }),
    match: (element) => {
      seen.push(element.attr("type") ?? "");
      return element.attr("type") === "text/javascript";
    },
  };
  const findings = lint(
    doc('<script type="text/javascript"></script>\n<script type="module"></script>\n<script></script>'),
    [rule],
  );
  // The bare <script> never reaches the logic: the selector filtered it out.
  assert.deepEqual(seen, ["text/javascript", "module"]);
  assert.equal(findings.length, 1);
});

test("a document rule runs once and can report anywhere", () => {
  const rule: Rule = {
    meta: meta({ ruleId: "head/doc", kind: "document", match: "logic", scope: "head" }),
    check: (document, ctx) => {
      const found = document.querySelector("title");
      return found === null ? [] : [ctx.report(found, { detail: "found a title" })];
    },
  };
  const findings = lint(doc("<title>Hi</title>"), [rule]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.detail, "found a title");
  assert.equal(findings[0]?.node.tag, "title");
});

test("a doctype finding points at the doctype and never carries a fix", () => {
  const rule: Rule = {
    meta: meta({ ruleId: "document/x", kind: "document", fix: { op: "remove-element", attr: null, token: null } }),
    check: (d, ctx) => {
      const doctype = d.doctype();
      return doctype === null ? [] : [ctx.report(doctype)];
    },
  };
  const [finding, ...rest] = lint(`<!-- a comment -->\n<!DOCTYPE html SYSTEM "about:legacy-compat">\n<html></html>`, [rule]);
  assert.equal(rest.length, 0);
  assert.ok(finding);
  assert.equal(finding.node.tag, "!doctype");
  assert.equal(finding.node.snippet, '<!DOCTYPE html SYSTEM "about:legacy-compat">');
  assert.deepEqual(finding.loc, { line: 2, col: 1 });
  assert.deepEqual(finding.range, [19, 63]);
  assert.equal(finding.fix, null, "even a remove-element rule gets no fix on a doctype");
});

test("a document with no doctype reports none", () => {
  assert.equal(parseHtml("<html><head></head><body></body></html>").doc.doctype(), null);
});

test("detectability: partial marks findings possible", () => {
  const rules: Rule[] = [
    { meta: meta({ ruleId: "meta/sure", selector: "meta[name]" }) },
    { meta: meta({ ruleId: "meta/maybe", selector: "meta[name]", detectability: "partial" }) },
  ];
  const findings = lint(doc('<meta name="a">'), rules);
  assert.equal(findings.find((f) => f.ruleId === "meta/sure")?.possible, false);
  assert.equal(findings.find((f) => f.ruleId === "meta/maybe")?.possible, true);
});

test("a finding carries the rule's severity, message, replacement and URL", () => {
  const rule: Rule = {
    meta: meta({
      ruleId: "meta/x",
      selector: "meta[name]",
      severity: "harmful",
      description: "It is bad.",
      replacement: "Use something else.",
    }),
  };
  const finding = lint(doc('<meta name="a">'), [rule])[0];
  assert.equal(finding?.severity, "harmful");
  assert.equal(finding?.message, "It is bad.");
  assert.equal(finding?.replacement, "Use something else.");
  assert.equal(finding?.url, "https://deadhead.cevdet.ch/rules/meta/x");
});

test("findings are sorted by source position", () => {
  const rules: Rule[] = [
    { meta: meta({ ruleId: "z/last", selector: "title" }) },
    { meta: meta({ ruleId: "a/first", selector: "meta[charset]" }) },
  ];
  const findings = lint(doc('<meta charset="utf-8">\n<title>Hi</title>'), rules);
  assert.deepEqual(ids(findings), ["a/first", "z/last"]);
  assert.ok((findings[0]?.range?.[0] ?? 0) < (findings[1]?.range?.[0] ?? 0));
});

test("the same rule reporting the same element twice is deduplicated", () => {
  const rule: Rule = {
    meta: meta({ ruleId: "head/dupe", kind: "document", match: "logic" }),
    check: (document, ctx) => {
      const found = document.querySelector("title");
      return found === null ? [] : [ctx.report(found), ctx.report(found)];
    },
  };
  assert.equal(lint(doc("<title>Hi</title>"), [rule]).length, 1);
});

test("snippets come from the source and are truncated to 90 characters", () => {
  const long = `<meta name="description" content="${"x".repeat(200)}">`;
  const rule: Rule = { meta: meta({ ruleId: "meta/x", selector: "meta[name]" }) };
  const snippet = lint(doc(long), [rule])[0]?.node.snippet ?? "";
  assert.equal(snippet.length, 90);
  assert.ok(snippet.startsWith('<meta name="description"'));
  assert.ok(snippet.endsWith("…"));
});

test("suppression comments are honoured by the engine", () => {
  const rule: Rule = { meta: meta({ ruleId: "meta/x", selector: "meta[name]" }) };
  const html = doc('<!-- deadhead-disable-next-line meta/x -->\n<meta name="a">\n<meta name="b">');
  assert.equal(lint(html, [rule]).length, 2, "without suppressions");
  assert.equal(lint(html, [rule], true).length, 1, "with suppressions");
});

test("an unsupported selector is a build failure, not a silent no-match", () => {
  const rule: Rule = { meta: meta({ ruleId: "bad/sel", selector: "head > meta" }) };
  assert.throws(() => lint(doc("<title>Hi</title>"), [rule]), /unsupported selector/);
});

test("a rule that declares logic but ships none fails loudly", () => {
  const rule: Rule = { meta: meta({ ruleId: "meta/x", selector: "meta[name]", match: "logic" }) };
  assert.throws(() => lint(doc('<meta name="a">'), [rule]), /requires a match\(\) or fixable\(\) logic module/);
});

test("a logic rule shipping only fixable() matches on its selector alone", () => {
  const rule: Rule = {
    meta: meta({ ruleId: "meta/x", selector: "meta[name]", match: "logic" }),
    fixable: () => false,
  };
  assert.equal(lint(doc('<meta name="a"><meta charset="utf-8">'), [rule]).length, 1);
});

test("a rule with one tag-less alternative only visits elements that alternative can match", async () => {
  const { compile } = await import("../packages/core/engine.ts");
  const compiled = compile([{ meta: meta({ ruleId: "script/x", selector: 'script[type="a"], [itemtype$="b"]' }) }]);
  assert.equal(compiled.wildcard.length, 0);
  assert.equal(compiled.byTag.get("script")?.length, 1);
  assert.equal(compiled.byAttr.get("itemtype")?.length, 1);
});

test("an element matching two alternatives of one rule reports once", () => {
  const rule: Rule = { meta: meta({ ruleId: "attr/x", selector: "div[a], [a]" }) };
  assert.equal(lint(doc("", '<div a="1"></div><p a="2"></p>'), [rule]).length, 2);
});

test("findings on one element come in rule order, whatever bucket found them", () => {
  const rules: Rule[] = [
    { meta: meta({ ruleId: "attr/a", selector: "[data-x]" }) },
    { meta: meta({ ruleId: "attr/b", selector: "div" }) },
  ];
  assert.deepEqual(ids(lint(doc("", '<div data-x="1"></div>'), rules)), ["attr/a", "attr/b"]);
});

test("makeDocumentQueries narrows by leading tag and keeps document order", async () => {
  const { makeDocumentQueries } = await import("../packages/core/port.ts");
  const nodes = [{ t: "meta", a: "x" }, { t: "link", a: "y" }, { t: "meta", a: "z" }];
  const byTag = new Map([["meta", [nodes[0]!, nodes[2]!]], ["link", [nodes[1]!]]]);
  let ported = 0;
  const portFor = (n: { t: string; a: string }) => {
    ported++;
    return { tag: n.t, attr: (k: string) => (k === "name" ? n.a : undefined), hasAttr: (k: string) => k === "name", attrNames: () => ["name"] } as never;
  };
  const q = makeDocumentQueries(nodes, byTag, portFor);
  assert.deepEqual(q.querySelectorAll("meta[name]").map((p) => p.attr("name")), ["x", "z"]);
  assert.equal(ported, 2);
});

test("head and body rules both check unplaced markup: the page decides where it lands", () => {
  const rules: Rule[] = [
    { meta: meta({ ruleId: "meta/h", selector: "meta", scope: "head" }) },
    { meta: meta({ ruleId: "element/b", selector: "center", scope: "body" }) },
  ];
  assert.deepEqual(ids(lintAsWritten('<meta name="a">\n<center>x</center>', rules)), ["meta/h", "element/b"]);
});

test("neither head nor body rules check <html> itself", () => {
  const rules: Rule[] = [
    { meta: meta({ ruleId: "document/h", selector: "html", scope: "head" }) },
    { meta: meta({ ruleId: "document/b", selector: "html", scope: "body" }) },
    { meta: meta({ ruleId: "document/a", selector: "html", scope: "any" }) },
  ];
  assert.deepEqual(ids(lint(doc(""), rules)), ["document/a"]);
});
