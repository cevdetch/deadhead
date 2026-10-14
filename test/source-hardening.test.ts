import assert from "node:assert/strict";
import test from "node:test";
import { parseForESLint } from "@html-eslint/parser";

import { parseHtml } from "../packages/cli/adapter.ts";
import { compileForRun, lintSource } from "../packages/cli/source.ts";
import { runCompiled } from "../packages/core/engine.ts";
import { parseSuppressions } from "../packages/core/suppressions.ts";
import { fromProgram } from "../packages/eslint-plugin/adapter.ts";
import { loadRules } from "../packages/rules/load.ts";

const compiled = compileForRun(await loadRules(), {});
const page = (head: string, body: string) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page</title>' + head + '</head><body>' + body + '</body></html>';
const parsers = [parseHtml, (source: string) => fromProgram(parseForESLint(source, {}).ast, source)];

test("only parsed HTML comments can suppress findings", () => {
  for (const content of [
    '<script>const sample = "<!-- deadhead-disable -->";</script>',
    '<style>p::before { content: "<!-- deadhead-disable -->"; }</style>',
    '<textarea><!-- deadhead-disable --></textarea>',
    '<div data-example="<!-- deadhead-disable -->"></div>',
  ]) {
    const source = page("", content + '\n<p align="left">text</p>');
    for (const parse of parsers) {
      const parsed = parse(source);
      assert.deepEqual(parseSuppressions(parsed.comments).ids(), [], content);
      assert.ok(runCompiled(compiled, parsed, { suppressions: parseSuppressions(parsed.comments) }).some(f => f.ruleId === "attr/text-presentational"), content);
    }
  }
});

test("real suppression comments retain source order and next-line behavior", () => {
  const source = page("", '\n<!-- deadhead-disable-next-line attr/text-presentational -->\n<p align="left">hidden</p>\n<p align="right">reported</p>');
  for (const parse of parsers) {
    const parsed = parse(source);
    const findings = runCompiled(compiled, parsed, { suppressions: parseSuppressions(parsed.comments) });
    assert.equal(findings.filter(f => f.ruleId === "attr/text-presentational").length, 1);
  }
});

test("warning locations refer to the source after fixes", () => {
  const source = '<head>\n<meta name="keywords" content="x">\n<!-- deadhead-disable-next-line meta/typo -->\n</head>';
  const result = lintSource(source, "input.html", compiled, { fix: true });
  assert.deepEqual(result.warnings, [{ line: 2, id: "meta/typo" }]);
  assert.equal(result.initialFindings.length, 1);
  assert.equal(result.findings.length, 0);
});

test("adapter text excludes comments and preserves literal RCDATA and character references", () => {
  for (const source of [
    '<div>alpha<!-- beta -->gamma</div>',
    '<title><!-- literal --> &amp; <b></title>',
    '<TITLE><!-- literal --> &amp; <b></TITLE>',
    '<textarea>one\r\ntwo &#13;</textarea>',
    '<textarea>\r\none &amp; two</textarea>',
    '<div>before<textarea>&amp; <b>literal</b></textarea>after</div>',
    '<script>one\r\ntwo</script>',
  ]) {
    const selector = source.slice(1).split(/[ >]/)[0]!.toLowerCase();
    const ports = parsers.map(parse => parse(source).doc.querySelector(selector)!);
    assert.equal(ports[1]!.text(), ports[0]!.text(), source);
  }
});

test("document queries never treat literal markup in RCDATA as elements", () => {
  const source = page("", "<main>content</main>").replace("<title>Page</title>", "<title>Example <main>literal</main></title>");
  for (const parse of parsers) {
    const parsed = parse(source);
    assert.equal(parsed.doc.querySelectorAll("main").length, 1);
    assert.equal(parsed.doc.querySelector("title")!.children().length, 0);
    assert.equal(runCompiled(compiled, parsed).filter(f => f.ruleId === "document/main-multiple").length, 0);
  }
});

test("long snippets retain the existing whitespace, Unicode and truncation behavior", () => {
  for (const value of ["a".repeat(1_000_000), 'a\n\t\u00a0b '.repeat(100), "😀".repeat(60), "x".repeat(80) + " ".repeat(100)]) {
    const source = `<center>${value}</center>`;
    const finding = lintSource(source, "input.html", compiled, {}).findings.find(f => f.node.tag === "center")!;
    const normalized = source.replace(/\s+/g, " ").trim();
    const expected = normalized.length > 90 ? normalized.slice(0, 89) + "…" : normalized;
    assert.equal(finding.node.snippet, expected);
  }
});
