/**
 * Every fixture, through every adapter, asserting they agree.
 *
 * This — not code sharing — is what actually stops the three runtimes drifting
 * apart. Sharing a matcher only guarantees the matcher agrees; this checks
 * that the trees the adapters build agree too, which is where the interesting
 * bugs live (a `<template>`'s content fragment, an implied `<head>`, an
 * attribute name's case).
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseForESLint } from "@html-eslint/parser";
import { parseHTML } from "linkedom";

import { fromDocument } from "../../packages/browser/adapter.ts";
import { parseHtml } from "../../packages/cli/adapter.ts";
import { fromProgram } from "../../packages/eslint-plugin/adapter.ts";
import { collectFiles } from "../../packages/cli/lint.ts";
import { loadRules } from "../../packages/rules/load.ts";
import { type Rule, run } from "../../packages/core/index.ts";
import type { ElementPort, Finding } from "../../packages/core/types.ts";

/**
 * Rules that cannot be evaluated in a live DOM, because their verdict depends
 * on the original source text rather than on the tree.
 *
 * This is a real asymmetry, not drift: `head/charset-position` asks where a
 * declaration sits in the byte stream, and a rendered document has no byte
 * stream. Its own `## Detectability` section says so.
 *
 * The list is asserted in both directions below, so it cannot rot: a rule
 * listed here must actually diverge, and a rule not listed here must actually
 * agree.
 */
const SOURCE_DEPENDENT = new Set(["head/charset-position"]);

const rules: Rule[] = await loadRules();
const files = await collectFiles(["test/fixtures"]);

/**
 * Every adapter, and whether it can see the original source text.
 *
 * That single bit is the only legitimate reason two adapters may disagree, so
 * it is declared here rather than discovered: source-backed adapters must
 * agree with each other exactly, and a source-less one must agree with them
 * about everything except the source-dependent rules above.
 */
const ADAPTERS = [
  { name: "parse5", hasSource: true, parse: (src: string) => parseHtml(src) },
  {
    name: "html-eslint",
    hasSource: true,
    parse: (src: string) => fromProgram(parseForESLint(src, {}).ast, src),
  },
  {
    name: "dom",
    hasSource: false,
    parse: (src: string) => fromDocument(parseHTML(src).document),
  },
] as const;

type Comparable = {
  ruleId: string;
  severity: string;
  possible: boolean;
  message: string;
  replacement: string;
  url: string;
  tag: string;
};

/** The fields every adapter must agree on. */
const comparable = (finding: Finding): Comparable => ({
  ruleId: finding.ruleId,
  severity: finding.severity,
  possible: finding.possible,
  message: finding.message,
  replacement: finding.replacement,
  url: finding.url,
  tag: finding.node.tag,
});

type Run = Record<string, Finding[]>;

const results = new Map<string, Run>();
for (const file of files) {
  const source = await readFile(file, "utf8");
  const perAdapter: Run = {};
  for (const adapter of ADAPTERS) perAdapter[adapter.name] = run(rules, adapter.parse(source));
  results.set(file, perAdapter);
}

/** Findings from an adapter, in the shape the comparison cares about. */
const of = (file: string, adapter: string): Finding[] => results.get(file)?.[adapter] ?? [];

/**
 * Findings at one position carry no order of their own: each adapter's
 * collection order decides it, and that differs when an element rule and a
 * document rule report the same element. Sorting ties by rule id makes the
 * comparison about which findings exist where, which is what must agree.
 */
const tiesByRule = (findings: Finding[]): Finding[] =>
  [...findings].sort(
    (a, b) =>
      (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0) ||
      (a.loc?.line ?? 0) - (b.loc?.line ?? 0) ||
      (a.loc?.col ?? 0) - (b.loc?.col ?? 0) ||
      a.ruleId.localeCompare(b.ruleId),
  );

/** A source-less adapter ties every finding, so its list compares as a multiset. */
const asMultiset = (findings: Comparable[]): string[] => findings.map((f) => JSON.stringify(f)).sort();

test("the suite actually covers every fixture", () => {
  assert.ok(files.length > 0, "no fixtures found");
  assert.equal(results.size, files.length);
});

test("adapters that can see the source agree exactly", () => {
  const sourced = ADAPTERS.filter((a) => a.hasSource).map((a) => a.name);
  const [reference, ...rest] = sourced;
  assert.ok(reference !== undefined, "need a source-backed adapter");
  assert.ok(rest.length > 0, "need a second source-backed adapter to compare against");

  for (const file of results.keys()) {
    const expected: Comparable[] = tiesByRule(of(file, reference)).map(comparable);
    for (const name of rest) {
      assert.deepEqual(tiesByRule(of(file, name)).map(comparable), expected, `${name} vs ${reference}: ${file}`);
    }
  }
});

test("a source-less adapter agrees about everything it can evaluate", () => {
  for (const file of results.keys()) {
    const expected = asMultiset(
      of(file, "parse5")
        .filter((f) => !SOURCE_DEPENDENT.has(f.ruleId))
        .map(comparable),
    );
    for (const adapter of ADAPTERS.filter((a) => !a.hasSource)) {
      assert.deepEqual(asMultiset(of(file, adapter.name).map(comparable)), expected, `${adapter.name}: ${file}`);
    }
  }
});

test("source-backed adapters agree on positions too, not just findings", () => {
  for (const file of results.keys()) {
    const positions = (name: string) =>
      tiesByRule(of(file, name)).map((f) => `${f.ruleId}@${f.loc?.line}:${f.loc?.col}:${f.range?.[0]}`);
    assert.deepEqual(positions("html-eslint"), positions("parse5"), file);
  }
});

test("two rules on one element agree in every adapter, whatever order each collects them in", () => {
  // head/base-position (a document rule) and head/base-multiple both report
  // the second <base>; the DOM adapter, with no offsets, ties every finding.
  const source = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><base href="/a/"><base href="/b/"></head><body></body></html>';
  const findings = Object.fromEntries(ADAPTERS.map((a) => [a.name, run(rules, a.parse(source))]));
  const parse5 = findings["parse5"] ?? [];
  assert.ok(parse5.filter((f) => f.ruleId === "head/base-position" || f.ruleId === "head/base-multiple").length >= 3);
  for (const adapter of ADAPTERS) {
    const own = findings[adapter.name] ?? [];
    if (adapter.hasSource) assert.deepEqual(tiesByRule(own).map(comparable), tiesByRule(parse5).map(comparable), adapter.name);
    else assert.deepEqual(asMultiset(own.map(comparable)), asMultiset(parse5.filter((f) => !SOURCE_DEPENDENT.has(f.ruleId)).map(comparable)), adapter.name);
  }
});

test("the source-dependent list is honest in both directions", () => {
  const divergent = new Set<string>();
  for (const perAdapter of results.values()) {
    const inDom = new Set((perAdapter["dom"] ?? []).map((f) => f.ruleId));
    for (const finding of perAdapter["parse5"] ?? []) {
      if (!inDom.has(finding.ruleId)) divergent.add(finding.ruleId);
    }
  }

  // Anything that diverges must be declared. An undeclared divergence is the
  // drift this suite exists to catch.
  for (const ruleId of divergent) {
    assert.ok(
      SOURCE_DEPENDENT.has(ruleId),
      `${ruleId} differs between adapters but is not declared source-dependent`,
    );
  }

  // And a declaration that no longer describes reality is equally wrong:
  // whoever made the rule work in a DOM should delete the entry.
  for (const ruleId of SOURCE_DEPENDENT) {
    assert.ok(
      divergent.has(ruleId),
      `${ruleId} is declared source-dependent but no longer diverges; remove it`,
    );
  }
});

test("the DOM adapter offers no positions, and says so rather than guessing", () => {
  const dom = of("test/fixtures/attr/script-type-javascript/invalid.html", "dom");
  assert.ok(dom.length > 0);
  for (const finding of dom) {
    assert.equal(finding.range, null);
    assert.equal(finding.loc, null);
  }
});

test("snippets differ by construction, but name the same element", () => {
  const file = "test/fixtures/meta/http-equiv-x-ua-compatible/invalid.html";
  const fromSource = of(file, "parse5")[0];
  const rebuilt = of(file, "dom")[0];
  assert.ok(fromSource && rebuilt);
  assert.equal(fromSource.node.tag, rebuilt.node.tag);
  // parse5 slices the real source; the DOM rebuilds an open tag from the port.
  assert.match(fromSource.node.snippet, /^<meta http-equiv="X-UA-Compatible"/);
  assert.match(rebuilt.node.snippet, /^<meta /);
  assert.match(rebuilt.node.snippet, /http-equiv="X-UA-Compatible"/);
});

/** A doctype as the port reports it, with or without its position. */
const doctypeOf = (adapter: (typeof ADAPTERS)[number], html: string, withPosition: boolean) => {
  const doctype = adapter.parse(html).doc.doctype();
  if (doctype === null) return null;
  const facts = { tag: doctype.tag, name: doctype.name, publicId: doctype.publicId, systemId: doctype.systemId };
  return withPosition ? { ...facts, range: doctype.range(), loc: doctype.loc() } : facts;
};

const PAGE = '<html lang="en"><head><title>t</title></head><body></body></html>';

test("every adapter reads the doctype the same way", () => {
  const cases: Record<string, string> = {
    standard: `<!doctype html>\n${PAGE}`,
    uppercase: `<!DOCTYPE HTML>\n${PAGE}`,
    xhtml: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n${PAGE}`,
    "public id only": `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n${PAGE}`,
    "system id only": `<!DOCTYPE html SYSTEM "about:legacy-compat">\n${PAGE}`,
    "after a comment and whitespace": `<!-- build 42 -->\n\n  <!doctype html>\n${PAGE}`,
    missing: PAGE,
  };
  for (const [name, html] of Object.entries(cases)) {
    const expected = doctypeOf(ADAPTERS[0], html, false);
    for (const adapter of ADAPTERS) {
      assert.deepEqual(doctypeOf(adapter, html, false), expected, `${adapter.name}: ${name}`);
    }
    // Only the source-backed adapters can say where it is, and they must agree.
    assert.deepEqual(doctypeOf(ADAPTERS[1], html, true), doctypeOf(ADAPTERS[0], html, true), `positions: ${name}`);
    const dom = ADAPTERS[2].parse(html).doc.doctype();
    if (dom !== null) assert.deepEqual([dom.range(), dom.loc()], [null, null], `dom has no positions: ${name}`);
  }
  assert.deepEqual(doctypeOf(ADAPTERS[0], cases["uppercase"] ?? "", false), {
    tag: "!doctype",
    name: "html",
    publicId: "",
    systemId: "",
  });
});

test("source-backed adapters ignore a doctype the tree builder would ignore", () => {
  // The spec only honours a doctype before any text or element. linkedom
  // hoists every doctype to the front regardless, so the DOM adapter is left
  // out here; a real browser applies the rule before the port ever sees it.
  const cases: Record<string, string> = {
    "after text": `x<!doctype html>\n${PAGE}`,
    "inside html": '<html lang="en"><!doctype html><head><title>t</title></head><body></body></html>',
    duplicated: `<!doctype html><!DOCTYPE html PUBLIC "a" "b">\n${PAGE}`,
  };
  for (const [name, html] of Object.entries(cases)) {
    assert.deepEqual(doctypeOf(ADAPTERS[1], html, true), doctypeOf(ADAPTERS[0], html, true), name);
  }
  assert.equal(ADAPTERS[0].parse(cases["after text"] ?? "").doc.doctype(), null);
  assert.equal(doctypeOf(ADAPTERS[0], cases["duplicated"] ?? "", false)?.publicId, "");
});

test("a document rule can report on the doctype in every adapter", () => {
  const base = rules[0];
  assert.ok(base !== undefined);
  const probe: Rule = {
    meta: { ...base.meta, ruleId: "document/probe", kind: "document", selector: null, match: null },
    check: (doc, ctx) => {
      const doctype = doc.doctype();
      return doctype === null ? [] : [ctx.report(doctype, { detail: doctype.publicId })];
    },
  };
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">\n${PAGE}`;
  const findings = ADAPTERS.map((adapter) => run([probe], adapter.parse(html)));
  for (const [i, adapter] of ADAPTERS.entries()) {
    assert.deepEqual(findings[i]?.map(comparable), findings[0]?.map(comparable), adapter.name);
    assert.equal(findings[i]?.[0]?.node.tag, "!doctype", adapter.name);
    assert.equal(findings[i]?.[0]?.fix, null, adapter.name);
    assert.equal(findings[i]?.[0]?.detail, "-//W3C//DTD HTML 4.01//EN", adapter.name);
  }
});

test("no adapter lints inside elements the HTML parser treats as text", () => {
  // parse5 turns the contents of these into text, as a browser does; linkedom
  // and html-eslint build elements. The walker skips their descendants so all
  // three agree rather than two reporting a <font> the spec parser never sees.
  for (const tag of ["iframe", "noembed", "noframes", "noscript", "title", "xmp"]) {
    const html =
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><meta name="viewport" content="width=device-width"></head>' +
      `<body><${tag}><font color="red">x</font></${tag}></body></html>`;
    for (const adapter of ADAPTERS) {
      const inside = run(rules, adapter.parse(html)).filter((f) => f.node.tag === "font");
      assert.deepEqual(inside, [], `${adapter.name} linted inside <${tag}>`);
    }
  }
});

test("no adapter lints what follows a <plaintext>, which never ends", () => {
  // A spec parser reads everything after <plaintext> as text, end tags
  // included. The other parsers keep it open and nest the rest inside it,
  // markup that looks like elements and the closing body and html tags alike.
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><meta name="viewport" content="width=device-width"></head>' +
    '<body><plaintext>raw <font color="red">x</font>\n<p>after</p><center>y</center></body></html>';
  for (const adapter of ADAPTERS) {
    const after = run(rules, adapter.parse(html)).filter((f) => f.node.tag === "font" || f.node.tag === "center");
    assert.deepEqual(after, [], `${adapter.name} linted content after <plaintext>`);
  }
});

test("every adapter steps into a <template>", () => {
  // parse5 and the DOM park template markup in a `content` fragment;
  // html-eslint keeps it inline. All three must still see the script.
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><meta name="viewport" content="width=device-width"></head>' +
    '<body><template><script type="text/javascript"></script></template></body></html>';
  for (const adapter of ADAPTERS) {
    assert.deepEqual(
      run(rules, adapter.parse(html)).map((f) => f.ruleId),
      ["attr/script-type-javascript"],
      adapter.name,
    );
  }
});

test("<script> and <style> are elements in every adapter", () => {
  // html-eslint models them as ScriptTag/StyleTag with no `name`, so the
  // adapter has to synthesise the tag. Miss it and every script/* rule
  // silently stops existing in the ESLint plugin.
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><meta name="viewport" content="width=device-width">' +
    '<style>a{color:red}</style><script type="text/javascript"></script></head>' +
    "<body></body></html>";
  for (const adapter of ADAPTERS) {
    const tags = new Set<string>();
    const parsed = adapter.parse(html);
    const walkAll = (port: ElementPort): void => {
      tags.add(port.tag);
      for (const child of port.children()) walkAll(child);
    };
    for (const root of parsed.roots) walkAll(root);
    assert.ok(tags.has("script"), `${adapter.name} does not see <script>`);
    assert.ok(tags.has("style"), `${adapter.name} does not see <style>`);
  }
});

test("every adapter tells a page from a fragment the same way", () => {
  const cases: Record<string, boolean> = {
    "<!doctype html>\n<title>t</title>": true,
    '<html lang="en"><body></body></html>': true,
    "<!-- note -->\n<!doctype html>\n<p>x</p>": true,
    '<meta charset="utf-8">\n<title>t</title>': false,
    "<nav></nav>": false,
    // A doctype after text is one the tree builder ignores.
    "hello <!doctype html><p>x</p>": false,
  };
  for (const [html, page] of Object.entries(cases)) {
    for (const adapter of ADAPTERS.filter((a) => a.hasSource)) {
      assert.equal(adapter.parse(html).doc.isPage(), page, `${adapter.name}: ${html}`);
    }
    // A live document is the page the browser assembled, whatever the source was.
    const dom = ADAPTERS.find((a) => a.name === "dom");
    assert.ok(dom);
    assert.equal(dom.parse(html).doc.isPage(), true, `dom: ${html}`);
  }
});
