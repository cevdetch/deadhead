/**
 * The try page shows what the CLI would print and write. These tests hold its
 * view model to the CLI's own lint path over every fixture.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { collectFiles, compileForRun, lintSource } from "../packages/cli/lint.ts";
import { loadRules } from "../packages/rules/load.ts";
import { decodeShare, encodeShare, lintHtml, SHARE_LIMIT } from "../site/src/lib/playground.ts";

const compiled = compileForRun(await loadRules(), {});
const fixtures = await collectFiles(["test/fixtures"]);

test("lintHtml: the same findings, in the same order, as the CLI on every fixture", async () => {
  for (const file of fixtures) {
    const html = await readFile(file, "utf8");
    const cli = lintSource(html, file, compiled, {}).findings.map((f) => `${f.loc?.line}:${f.loc?.col} ${f.ruleId}`);
    const view = lintHtml(html, compiled).findings.map((f) => `${f.line}:${f.col} ${f.ruleId}`);
    assert.deepEqual(view, cli, file);
  }
});

test("lintHtml: the fixed HTML and the fix count are what --fix writes", async () => {
  for (const file of fixtures) {
    const html = await readFile(file, "utf8");
    const cli = lintSource(html, file, compiled, { fix: true });
    const view = lintHtml(html, compiled);
    assert.equal(view.output, cli.output, file);
    assert.equal(view.fixed, cli.fixed, file);
  }
});

test("lintHtml: counts per severity, the fixable flag, and the advice a reader acts on", () => {
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>' +
    '<meta name="viewport" content="width=device-width"><meta http-equiv="X-UA-Compatible" content="IE=edge">' +
    '<meta name="keywords" content="a"></head><body></body></html>';
  const view = lintHtml(html, compiled);
  const keywords = view.findings.find((f) => f.ruleId === "meta/keywords");
  const xua = view.findings.find((f) => f.ruleId === "meta/http-equiv-x-ua-compatible");
  assert.ok(keywords && xua);
  assert.equal(keywords.fixable, true);
  assert.equal(xua.fixable, false, "its fix op is none");
  assert.equal(keywords.url, "https://deadhead.cevdet.ch/rules/meta/keywords");
  assert.match(keywords.snippet, /<meta name="keywords"/);
  assert.equal(view.counts.unnecessary, view.findings.filter((f) => f.severity === "unnecessary").length);
  assert.equal(view.counts.harmful + view.counts.deprecated + view.counts.unnecessary, view.findings.length);
});

test("lintHtml: an empty paste has nothing to report and nothing to fix", () => {
  const view = lintHtml("", compiled);
  assert.deepEqual(view.findings, []);
  assert.equal(view.output, "");
  assert.equal(view.fixed, 0);
});

test("share: HTML survives the round trip through the fragment, Unicode included", async () => {
  const html = '<!doctype html><html lang="ja"><head><title>日本語 &amp; ü</title></head><body></body></html>';
  const fragment = await encodeShare(html);
  assert.match(fragment, /^#html=[A-Za-z0-9_-]+$/, "base64url, safe in a link");
  assert.equal(await decodeShare(fragment), html);
});

test("share: compression keeps a typical head well under the limit", async () => {
  const head = `<!doctype html><html lang="en"><head>${'<meta name="x" content="y">'.repeat(200)}</head><body></body></html>`;
  const fragment = await encodeShare(head);
  assert.ok(fragment.length < head.length / 4, `${fragment.length} characters for ${head.length}`);
  assert.ok(SHARE_LIMIT >= 16_000);
});

test("share: a fragment with no HTML, or a corrupt one, yields null", async () => {
  assert.equal(await decodeShare(""), null);
  assert.equal(await decodeShare("#section"), null);
  assert.equal(await decodeShare("#html=not*base64"), null);
  assert.equal(await decodeShare("#html=AAAA"), null, "valid base64url, not a deflate stream");
});
