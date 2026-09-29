import assert from "node:assert/strict";
import test from "node:test";

import { type Region, walk } from "../packages/core/walker.ts";
import { parseHtml } from "../packages/cli/adapter.ts";
import { parseForESLint } from "@html-eslint/parser";
import { fromProgram } from "../packages/eslint-plugin/adapter.ts";

/** Every element with its region, walked from what @html-eslint/parser built. */
const regionsAsWritten = (html: string): [string, Region][] => {
  const seen: [string, Region][] = [];
  walk(fromProgram(parseForESLint(html, {}).ast, html).roots, (element, region) => seen.push([element.tag, region]));
  return seen;
};

const visited = (html: string, options = {}): string[] => {
  const seen: string[] = [];
  walk(parseHtml(html).roots, (element) => seen.push(element.tag), options);
  return seen;
};

const regions = (html: string): Record<string, Region> => {
  const out: Record<string, Region> = {};
  walk(parseHtml(html).roots, (element, region) => {
    out[element.tag] ??= region;
  });
  return out;
};

test("the walk starts at <html> and covers both halves", () => {
  const seen = visited("<!doctype html><html><head><title>t</title></head><body><p>x</p></body></html>");
  assert.deepEqual(seen, ["html", "head", "title", "body", "p"]);
});

test("region tracks which half of the document a node is in", () => {
  const where = regions(
    "<!doctype html><html><head><title>t</title></head><body><p>x</p></body></html>",
  );
  assert.equal(where["html"], null, "<html> is in neither half");
  assert.equal(where["head"], "head");
  assert.equal(where["title"], "head");
  assert.equal(where["body"], "body");
  assert.equal(where["p"], "body");
});

test("visitBody: false stops at <body>, which is the scope performance lever", () => {
  const seen = visited(
    "<!doctype html><html><head><title>t</title></head><body><p>x</p></body></html>",
    { visitBody: false },
  );
  assert.deepEqual(seen, ["html", "head", "title"]);
});

test("descendants of opaque elements are content, not markup to lint", () => {
  for (const tag of ["pre", "code", "textarea", "samp", "kbd"]) {
    const seen = visited(
      `<!doctype html><html><head></head><body><${tag}><b>x</b></${tag}></body></html>`,
    );
    assert.ok(seen.includes(tag), `<${tag}> itself is still visited`);
    assert.ok(!seen.includes("b"), `contents of <${tag}> are skipped`);
  }
});

test("<template> is walked by default and skippable on request", () => {
  const html =
    "<!doctype html><html><head></head><body><template><span>x</span></template></body></html>";
  assert.ok(visited(html).includes("span"));
  const skipped = visited(html, { skipTemplates: true });
  assert.ok(!skipped.includes("template"));
  assert.ok(!skipped.includes("span"));
});

test("an empty document walks nothing rather than throwing", () => {
  assert.deepEqual(visited(""), [], "an empty file is a fragment: nothing is invented around it");
  const seen: string[] = [];
  walk([], (element) => seen.push(element.tag));
  assert.deepEqual(seen, []);
});

test("deeply nested markup does not overflow the stack", async () => {
  const { parseHtml } = await import("../packages/cli/adapter.ts");
  const { run } = await import("../packages/core/engine.ts");
  const depth = 10_000;
  const html = `<!doctype html><html lang="en"><head><title>x</title></head><body>${"<div>".repeat(depth)}<blink>x</blink>${"</div>".repeat(depth)}</body></html>`;
  const parsed = parseHtml(html);
  const findings = run(
    [{ meta: { ruleId: "element/blink", title: "t", description: "d", pubDate: "2026-01-01", status: "avoid", severity: "unnecessary", standardsBasis: "spec", detectability: "yes", kind: "element", scope: "body", selector: "blink", match: null, fix: { op: "none", attr: null, token: null }, replacement: "r", tags: [], impacts: [], related: [] } }],
    parsed,
  );
  assert.equal(findings.length, 1);
  assert.equal(parsed.roots[0]?.children()[1]?.children()[0]?.text().length, 1);
});

test("a fragment's top-level markup is unplaced, and so is everything inside it", () => {
  assert.deepEqual(regionsAsWritten('<meta name="a"><nav><a href="/">x</a></nav>'), [
    ["meta", "unplaced"],
    ["nav", "unplaced"],
    ["a", "unplaced"],
  ]);
});

test("a written <head> or <body> places what it holds; other children of <html> stay unplaced", () => {
  assert.deepEqual(regionsAsWritten('<html lang="en"><title>t</title><body><p>x</p></body></html>'), [
    ["html", null],
    ["title", "unplaced"],
    ["body", "body"],
    ["p", "body"],
  ]);
});
