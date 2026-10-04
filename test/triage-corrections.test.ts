/**
 * Rules whose reasoning the corpus triage (Tranco top 10,000, 2026-10-04)
 * corrected against primary sources. Each test runs one rule through the
 * engine on a small page.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { parseHtml } from "../packages/cli/adapter.ts";
import { run } from "../packages/core/engine.ts";
import { loadRules } from "../packages/rules/load.ts";

const rules = await loadRules();

const lint = (ruleId: string, head: string, body = "", fix = false) => {
  const rule = rules.filter((r) => r.meta.ruleId === ruleId);
  assert.equal(rule.length, 1, `${ruleId} not found`);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>${head}</head><body>${body}</body></html>`;
  return run(rule, parseHtml(html), { fix });
};

test("x-dns-prefetch-control: on and empty change nothing in any engine; other values opt out in Firefox", () => {
  const tag = (attrs: string) => lint("meta/http-equiv-x-dns-prefetch-control", `<meta http-equiv="x-dns-prefetch-control" ${attrs}>`, "", true);
  for (const attrs of ['content="on"', 'content="ON"', 'content=""', ""]) {
    const findings = tag(attrs);
    assert.equal(findings.length, 1, attrs);
    assert.notEqual(findings[0]?.fix, null, `${attrs}: removal is inert, so it is fixed`);
  }
  assert.equal(tag('content="off"').length, 0);
  assert.equal(tag('content="no"').length, 0, "Firefox reads any value but on or empty as off");
  assert.equal(tag('content=" on "').length, 0, "neither engine trims: padded, it is not on, and Firefox reads it as off");
});

test("charset-value: an empty charset declares nothing", () => {
  assert.equal(lint("meta/charset-value", '<meta name="verify" charset="">').length, 0);
  assert.equal(lint("meta/charset-value", '<meta charset="shift_jis">').length, 1);
});

test("viewport-missing: a desktop page that names its separate mobile URL needs no viewport", () => {
  const page = (head: string) => {
    const rule = rules.filter((r) => r.meta.ruleId === "head/viewport-missing");
    return run(rule, parseHtml(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>${head}</head><body></body></html>`)).length;
  };
  assert.equal(page('<link rel="alternate" media="only screen and (max-width: 640px)" href="https://m.example.com/">'), 0);
  assert.equal(page('<link rel="alternate" hreflang="de" href="https://example.com/de/">'), 1, "an alternate without media is no mobile URL");
  assert.equal(page(""), 1);
});

test("meta/title: Swiftype reads its own class=\"swiftype\" title field", () => {
  assert.equal(lint("meta/title", '<meta class="swiftype" name="title" data-type="string" content="t">').length, 0);
  assert.equal(lint("meta/title", '<meta name="title" content="t">').length, 1);
});
