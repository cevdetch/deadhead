import assert from "node:assert/strict";
import test from "node:test";

import { parseHtml } from "../packages/cli/adapter.ts";
import { type Rule, run } from "../packages/core/engine.ts";
import { type Fix, applyFixes, computeFix } from "../packages/core/fix.ts";
import type { RuleMeta } from "../packages/core/vocabulary.ts";

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

const fixesFor = (html: string, rules: Rule[]): Fix[] =>
  run(rules, parseHtml(html), { fix: true }).flatMap((finding) =>
    finding.fix === null ? [] : [finding.fix],
  );

const removeMeta: Rule = {
  meta: meta({ ruleId: "meta/x", selector: "meta[name]", fix: { op: "remove-element", attr: null, token: null } }),
};
const removeType: Rule = {
  meta: meta({
    ruleId: "script/t",
    selector: "script[type]",
    fix: { op: "remove-attribute", attr: "type", token: null },
  }),
};

test("removing an element on its own line takes the line with it", () => {
  const html = '<html><head>\n    <meta name="a">\n    <title>t</title>\n</head><body></body></html>';
  const [fix] = fixesFor(html, [removeMeta]);
  assert.ok(fix);
  assert.equal(html.slice(...fix.range), '    <meta name="a">\n');
  assert.equal(applyFixes(html, [fix]).output.includes("\n\n"), false, "no blank line left behind");
});

test("removing an element sharing a line takes only the element", () => {
  const html = '<html><head><title>t</title><meta name="a"></head><body></body></html>';
  const [fix] = fixesFor(html, [removeMeta]);
  assert.ok(fix);
  assert.equal(html.slice(...fix.range), '<meta name="a">');
});

test("removing an attribute takes the whitespace before it", () => {
  const html = '<html><head><script type="text/javascript" src="a.js"></script></head><body></body></html>';
  const [fix] = fixesFor(html, [removeType]);
  assert.ok(fix);
  assert.equal(html.slice(...fix.range), ' type="text/javascript"');
  assert.match(applyFixes(html, [fix]).output, /<script src="a\.js">/);
});

test("a partial rule is never autofixed, however clear the edit would be", () => {
  const unsure: Rule = {
    meta: meta({
      ruleId: "meta/maybe",
      selector: "meta[name]",
      detectability: "partial",
      fix: { op: "remove-element", attr: null, token: null },
    }),
  };
  const html = '<html><head><meta name="a"></head><body></body></html>';
  const findings = run([unsure], parseHtml(html));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.possible, true);
  assert.equal(findings[0]?.fix, null);
});

test("fix: none produces no fix", () => {
  const inert: Rule = { meta: meta({ ruleId: "meta/inert", selector: "meta[name]" }) };
  assert.deepEqual(fixesFor('<html><head><meta name="a"></head><body></body></html>', [inert]), []);
});

test("a remove-attribute rule whose attribute is absent produces no fix", () => {
  // The selector matched on something else, so there is nothing to delete.
  const odd: Rule = {
    meta: meta({
      ruleId: "script/odd",
      selector: "script",
      fix: { op: "remove-attribute", attr: "type", token: null },
    }),
  };
  const html = "<html><head><script></script></head><body></body></html>";
  const findings = run([odd], parseHtml(html));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.fix, null);
});

test("fixable() vetoes a fix per finding and leaves the finding reported", () => {
  const vetoed: Rule = {
    meta: meta({
      ruleId: "meta/veto",
      selector: "meta[name]",
      match: "logic",
      fix: { op: "remove-element", attr: null, token: null },
    }),
    // No match(): the selector alone decides, and fixable() only vetoes.
    fixable: (element) => element.attr("name") !== "keep",
  };
  const html = '<html><head><meta name="drop"><meta name="keep"></head><body></body></html>';
  const findings = run([vetoed], parseHtml(html), { fix: true });
  assert.deepEqual(
    findings.map((f) => [f.node.snippet, f.fix === null ? null : html.slice(...f.fix.range)]),
    [
      ['<meta name="drop">', '<meta name="drop">'],
      ['<meta name="keep">', null],
    ],
  );
});

test("fixable() runs only on the --fix path", () => {
  let calls = 0;
  const counted: Rule = {
    meta: meta({ ruleId: "meta/count", selector: "meta[name]", fix: { op: "remove-element", attr: null, token: null } }),
    fixable: () => {
      calls++;
      return true;
    },
  };
  run([counted], parseHtml('<html><head><meta name="a"></head><body></body></html>'));
  assert.equal(calls, 0);
});

// --- applying ---------------------------------------------------------------

const fix = (start: number, end: number, text = ""): Fix => ({ ruleId: "t/x", range: [start, end], text });

test("fixes apply back to front, so earlier offsets stay valid", () => {
  const source = "0123456789";
  const { output, applied, skipped } = applyFixes(source, [fix(1, 3), fix(6, 8)]);
  assert.equal(output, "034589");
  assert.equal(applied.length, 2);
  assert.equal(skipped.length, 0);
});

test("input order does not matter", () => {
  const source = "0123456789";
  assert.equal(applyFixes(source, [fix(6, 8), fix(1, 3)]).output, applyFixes(source, [fix(1, 3), fix(6, 8)]).output);
});

test("overlapping fixes are skipped, not merged", () => {
  // Two rules disagreeing about the same bytes is a conflict; guessing at a
  // resolution would corrupt the file.
  const { output, applied, skipped } = applyFixes("0123456789", [fix(2, 6), fix(4, 8)]);
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 1);
  assert.equal(applied[0]?.range[0], 4, "the later fix wins, the earlier is deferred");
  assert.equal(output, "012389");
});

test("adjacent fixes both apply", () => {
  const { applied, output } = applyFixes("0123456789", [fix(2, 4), fix(4, 6)]);
  assert.equal(applied.length, 2);
  assert.equal(output, "016789");
});

test("applied and skipped come back in document order", () => {
  const { applied } = applyFixes("0123456789", [fix(6, 8), fix(0, 2), fix(3, 5)]);
  assert.deepEqual(applied.map((f) => f.range[0]), [0, 3, 6]);
});

test("replacement text is honoured, not just deletion", () => {
  assert.equal(applyFixes("<b>x</b>", [fix(0, 3, "<i>")]).output, "<i>x</b>");
});

// --- remove-token -----------------------------------------------------------

const dropShortcut: Rule = {
  meta: meta({
    ruleId: "link/s",
    selector: 'link[rel~="shortcut" i]',
    fix: { op: "remove-token", attr: "rel", token: "shortcut" },
  }),
};

const page = (link: string): string =>
  `<html><head><meta charset="utf-8"><title>t</title>\n${link}\n</head><body></body></html>`;

const fixed = (link: string): string => {
  const html = page(link);
  return applyFixes(html, fixesFor(html, [dropShortcut])).output;
};

test("remove-token drops one keyword and keeps the rest", () => {
  // The whole point: a rule that knows one token is obsolete must not assert a
  // new value for an attribute it was never asked about.
  assert.match(fixed('<link rel="shortcut icon" href="/f.ico">'), /rel="icon"/);
  assert.match(fixed('<link rel="shortcut icon mask-icon" href="/f.svg">'), /rel="icon mask-icon"/);
  assert.match(fixed('<link rel="icon shortcut" href="/f.ico">'), /rel="icon"/);
});

test("remove-token matches the keyword case-insensitively but leaves survivors alone", () => {
  // rel keywords are ASCII case-insensitive, so `Shortcut` must be found; the
  // tokens that stay are the author's text and are not normalised.
  assert.match(fixed('<link rel="Shortcut Icon mask-icon" href="/f.svg">'), /rel="Icon mask-icon"/);
});

test("remove-token never touches the quote style", () => {
  // The edit happens inside the delimiter. Rewriting quotes is the exact thing
  // range-based fixes exist to avoid.
  assert.match(fixed("<link rel='shortcut icon' href='/f.ico'>"), /rel='icon'/);
});

test("remove-token declines when it would empty the attribute", () => {
  const html = page('<link rel="shortcut" href="/f.ico">');
  const findings = run([dropShortcut], parseHtml(html));
  assert.equal(findings.length, 1, "still reported");
  assert.equal(findings[0]?.fix, null, "but not fixed: rel=\"\" means something else");
});

test("remove-token declines on an unquoted value, which can hold only one token", () => {
  const html = page("<link rel=shortcut href=/f.ico>");
  const findings = run([dropShortcut], parseHtml(html));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.fix, null);
});

test("remove-token without a token in frontmatter produces no fix", () => {
  const broken: Rule = {
    meta: meta({
      ruleId: "link/broken",
      selector: "link[rel]",
      fix: { op: "remove-token", attr: "rel", token: null },
    }),
  };
  const html = page('<link rel="shortcut icon" href="/f.ico">');
  assert.equal(run([broken], parseHtml(html))[0]?.fix, null);
});

// --- remove-tokens ----------------------------------------------------------

const dropDead: Rule = {
  meta: meta({
    ruleId: "link/d",
    selector: 'link[rel~="index" i], link[rel~="previous" i]',
    fix: { op: "remove-tokens", attr: "rel", token: null },
  }),
};

const pruned = (link: string): string => {
  const html = page(link);
  return applyFixes(html, fixesFor(html, [dropDead])).output;
};

test("remove-tokens keeps the live keywords and the element", () => {
  // The bug this op exists for: remove-element deleted a live feed link.
  const out = pruned('<link rel="alternate index" type="application/rss+xml" href="/feed.xml">');
  assert.match(out, /<link rel="alternate" type="application\/rss\+xml" href="\/feed\.xml">/);
});

test("remove-tokens removes every matched keyword in any case, keeping survivors as written", () => {
  assert.match(pruned('<link rel="Index stylesheet PREVIOUS" href="/a.css">'), /rel="stylesheet"/);
});

test("remove-tokens removes the element, with its line, once no keyword survives", () => {
  const out = pruned('<link rel="index previous" href="/">');
  assert.ok(!out.includes("<link"), out);
  assert.ok(!out.includes("\n\n"), "no blank line left behind");
});

test("remove-tokens treats an unquoted value as its one matched keyword", () => {
  assert.ok(!pruned("<link rel=index href=/>").includes("<link"));
});

test("remove-tokens never touches the quote style", () => {
  assert.match(pruned("<link rel='alternate index' href='/feed.xml'>"), /rel='alternate'/);
});

// A rule whose selector has an alternative on another attribute: it can fire
// without any of its `rel` keywords present: an empty attribute, a
// `match: "logic"` refinement, or the other alternative.
const dropDeadOrTitle: Rule = {
  meta: meta({
    ruleId: "link/e",
    selector: 'link[rel~="index" i], link[title]',
    fix: { op: "remove-tokens", attr: "rel", token: null },
  }),
};

const prunedOrTitle = (link: string): string => {
  const html = page(link);
  return applyFixes(html, fixesFor(html, [dropDeadOrTitle])).output;
};

test("remove-tokens declines, without touching the element, when none of its keywords are in the attribute", () => {
  // Matched via `link[title]`, not a dead `rel` keyword: nothing is dead, so
  // there is nothing to fix. Guessing here would violate "never change
  // behaviour" the same way deleting the element would.
  const link = '<link rel="stylesheet" title="x" href="/a.css">';
  assert.equal(prunedOrTitle(link), page(link));
  const findings = run([dropDeadOrTitle], parseHtml(page(link)));
  assert.equal(findings.length, 1, "still reported");
  assert.equal(findings[0]?.fix, null);
});

test("remove-tokens declines on an empty attribute", () => {
  const html = page('<link rel="" title="x" href="/a.css">');
  assert.equal(run([dropDeadOrTitle], parseHtml(html))[0]?.fix, null);
});

test("remove-tokens declines on an unquoted value holding none of its keywords", () => {
  const html = page("<link rel=stylesheet title=x href=/a.css>");
  assert.equal(run([dropDeadOrTitle], parseHtml(html))[0]?.fix, null);
});

// Two separate rules, each after one keyword. Their fixes both rewrite the
// same `rel` value, so they overlap and only one applies per pass: the
// element is gone once both keywords are cleared, not in one.
const dropIndex: Rule = {
  meta: meta({
    ruleId: "link/index",
    selector: 'link[rel~="index" i]',
    fix: { op: "remove-tokens", attr: "rel", token: null },
  }),
};
const dropPavatar: Rule = {
  meta: meta({
    ruleId: "link/pavatar",
    selector: 'link[rel~="pavatar" i]',
    fix: { op: "remove-tokens", attr: "rel", token: null },
  }),
};

test("remove-tokens fixes from two rules on the same attribute converge on removing the element", () => {
  const rules = [dropIndex, dropPavatar];
  let output = page('<link rel="index pavatar" href="/">');
  for (let pass = 0; pass < 5; pass++) {
    const fixes = fixesFor(output, rules);
    if (fixes.length === 0) break;
    output = applyFixes(output, fixes).output;
  }
  assert.ok(!output.includes("<link"), output);
});

test("attr/script-event-for never fixes a pair the browser skips: deleting event would run it", async () => {
  const { loadRules } = await import("../packages/rules/load.ts");
  const rule = (await loadRules()).find((r) => r.meta.ruleId === "attr/script-event-for");
  assert.ok(rule, "rule exists");
  const html =
    '<html><head><script for="button" event="onclick">a();</script>' +
    '<script for="window" event="onload">b();</script></head><body></body></html>';
  const findings = run([rule], parseHtml(html), { fix: true });
  assert.equal(findings.length, 2);
  assert.equal(findings[0]?.fix, null);
  assert.ok(findings[1]?.fix);
  assert.equal(html.slice(...findings[1].fix.range), ' event="onload"');
});

// --- remove-attributes -------------------------------------------------------

test("remove-attributes deletes every named attribute present, and keeps value tests", () => {
  const source = '<input type="number" maxlength="3" size="4" name="n">';
  const el = parseHtml(source).doc.querySelector("input");
  assert.ok(el);
  const rule: RuleMeta = meta({
    ruleId: "attr/t",
    selector: 'input[type="number" i][maxlength], input[type="number" i][size]',
    fix: { op: "remove-attributes", attr: null, token: null },
  });
  const fix = computeFix(rule, el, source);
  assert.ok(fix);
  assert.equal(applyFixes(source, [fix]).output, '<input type="number" name="n">');
});

test("remove-attributes drops only the attributes present on this element", () => {
  const source = '<a href="x" coords="1,1,2,2">text</a>';
  const el = parseHtml(source).doc.querySelector("a");
  assert.ok(el);
  const rule: RuleMeta = meta({
    ruleId: "attr/a",
    selector: "a[coords], a[shape]",
    fix: { op: "remove-attributes", attr: null, token: null },
  });
  const fix = computeFix(rule, el, source);
  assert.ok(fix);
  assert.equal(applyFixes(source, [fix]).output, '<a href="x">text</a>');
});

test("remove-attributes declines when none of its attributes are present", () => {
  const source = '<a href="x">text</a>';
  const el = parseHtml(source).doc.querySelector("a");
  assert.ok(el);
  const rule: RuleMeta = meta({
    ruleId: "attr/a",
    selector: "a[coords], a[shape]",
    fix: { op: "remove-attributes", attr: null, token: null },
  });
  assert.equal(computeFix(rule, el, source), null);
});

test("remove-attributes declines with no selector", () => {
  const source = '<a href="x" coords="1,1,2,2">text</a>';
  const el = parseHtml(source).doc.querySelector("a");
  assert.ok(el);
  const rule: RuleMeta = meta({
    ruleId: "attr/a",
    selector: null,
    fix: { op: "remove-attributes", attr: null, token: null },
  });
  assert.equal(computeFix(rule, el, source), null);
});

test("remove-attributes never touches an attribute the selector only value-tests", () => {
  // presenceTests skips [type="number" i]: it is a condition, not a target.
  const source = '<input type="number" maxlength="3" name="n">';
  const el = parseHtml(source).doc.querySelector("input");
  assert.ok(el);
  const rule: RuleMeta = meta({
    ruleId: "attr/t",
    selector: 'input[type="number" i][maxlength]',
    fix: { op: "remove-attributes", attr: null, token: null },
  });
  const fix = computeFix(rule, el, source);
  assert.ok(fix);
  assert.equal(applyFixes(source, [fix]).output, '<input type="number" name="n">');
});

// --- performance --------------------------------------------------------

test("applyFixes is linear: 50k fixes finish fast", async () => {
  const { applyFixes: applyFixesModule } = await import("../packages/core/fix.ts");
  const unit = '<i class="x"></i>';
  const source = unit.repeat(50_000);
  const fixes = Array.from({ length: 50_000 }, (_, i) => ({
    ruleId: "t",
    range: [i * unit.length + 2, i * unit.length + 12] as const,
    text: "",
  }));
  const started = performance.now();
  const { output, applied } = applyFixesModule(source, fixes);
  assert.equal(applied.length, 50_000);
  assert.equal(output, "<i></i>".repeat(50_000));
  assert.ok(performance.now() - started < 500, "took too long");
});

test("a meta carrying two keys is never removed whole: the finding stays, the fix goes", () => {
  // Deleting the element under a rule about one key would delete the other, live key with it.
  for (const extra of ['property="og:site_name"', 'http-equiv="description"', 'itemprop="name"', 'charset="utf-8"']) {
    const html = `<html><head><meta name="a" ${extra} content="x"><title>t</title></head><body></body></html>`;
    const findings = run([removeMeta], parseHtml(html), { fix: true });
    assert.equal(findings.length, 1, extra);
    assert.equal(findings[0]?.fix, null, extra);
  }
  assert.equal(fixesFor('<html><head><meta name="a" content="x"></head><body></body></html>', [removeMeta]).length, 1, "one key: removed as before");
});
