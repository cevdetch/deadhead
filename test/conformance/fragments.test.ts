/**
 * Fragments (layout partials, components, framework templates) through the
 * two source-backed adapters. They must build the tree the author wrote and
 * agree on every finding and position. The DOM adapter is not run here: it
 * only ever sees the page a browser assembled, and linkedom is not a spec
 * parser.
 */

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import { parseForESLint } from "@html-eslint/parser";

import { parseHtml } from "../../packages/cli/adapter.ts";
import { fromProgram } from "../../packages/eslint-plugin/adapter.ts";
import { loadRules } from "../../packages/rules/load.ts";
import { applyFixes, type Rule, run } from "../../packages/core/index.ts";
import type { ElementPort, Parsed } from "../../packages/core/types.ts";

const DIR = "test/fragments";
const rules: Rule[] = await loadRules();
const names = (await readdir(DIR)).filter((name) => name.endsWith(".html")).sort();
const sources = new Map<string, string>();
for (const name of names) sources.set(name, await readFile(`${DIR}/${name}`, "utf8"));

const ADAPTERS: Record<string, (source: string) => Parsed> = {
  parse5: (source) => parseHtml(source),
  "html-eslint": (source) => fromProgram(parseForESLint(source, {}).ast, source),
};

/** The element tree, one line per element, indented by depth. */
const shape = (parsed: Parsed): string[] => {
  const out: string[] = [];
  const visit = (port: ElementPort, depth: number): void => {
    out.push(`${"  ".repeat(depth)}${port.tag}`);
    for (const child of port.children()) visit(child, depth + 1);
  };
  for (const root of parsed.roots) visit(root, 0);
  return out;
};

test("the fragment set is there", () => {
  assert.ok(names.length >= 5, `expected fragments in ${DIR}`);
});

test("no fragment is a page, in either adapter", () => {
  for (const [name, source] of sources) {
    for (const [adapter, parse] of Object.entries(ADAPTERS)) {
      assert.equal(parse(source).doc.isPage(), false, `${adapter}: ${name}`);
    }
  }
});

test("both adapters build the tree the author wrote", () => {
  for (const [name, source] of sources) {
    const parse5 = ADAPTERS["parse5"]!(source);
    assert.deepEqual(shape(parse5), shape(ADAPTERS["html-eslint"]!(source)), name);
    for (const root of parse5.roots) assert.equal(root.parent(), null, `${name}: a root has no parent`);
  }
});

test("a bare table row survives, and nothing is invented around it", () => {
  assert.deepEqual(shape(parseHtml(sources.get("row.html")!)), ["tr", "  td"]);
  assert.deepEqual(shape(parseHtml(sources.get("layout.html")!)), ["head", "  title", "body", "  main"]);
});

test("both adapters report the same findings at the same positions", () => {
  const at = (parsed: Parsed) =>
    run(rules, parsed).map((f) => `${f.ruleId}@${f.loc?.line}:${f.loc?.col}:${f.range?.[0]}`);
  for (const [name, source] of sources) {
    assert.deepEqual(at(ADAPTERS["parse5"]!(source)), at(ADAPTERS["html-eslint"]!(source)), name);
  }
});

test("a fix splices the fragment's own text", () => {
  const source = sources.get("mixed.html")!;
  const fixes = run(rules, parseHtml(source), { fix: true }).flatMap((f) => (f.fix === null ? [] : [f.fix]));
  assert.equal(fixes.length, 1, "meta/keywords removes its element");
  const { output } = applyFixes(source, fixes);
  assert.doesNotMatch(output, /keywords/);
  assert.match(output, /^<nav><\/nav>\n/);
});

/** What each fragment reports: the markup it holds, never head content it lacks. */
const EXPECTED: Record<string, string[]> = {
  "component.html": ["element/center"],
  "dublin-core-partial.html": [],
  "duplicate-title.html": ["head/title"],
  "head-partial.html": ["meta/http-equiv-x-ua-compatible"],
  "late-charset.html": ["head/charset-position"],
  "layout.html": ["attr/body-presentational"],
  "mixed.html": ["meta/keywords"],
  "og-partial.html": [],
  "row.html": ["attr/td-abbr-axis-scope"],
};

test("a fragment reports what it holds and no head content it lacks", () => {
  assert.deepEqual(Object.keys(EXPECTED).sort(), names, "every fragment needs an expected list");
  for (const [name, source] of sources) {
    for (const [adapter, parse] of Object.entries(ADAPTERS)) {
      assert.deepEqual(run(rules, parse(source)).map((f) => f.ruleId), EXPECTED[name], `${adapter}: ${name}`);
    }
  }
});
