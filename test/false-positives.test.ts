/**
 * False positives found by the corpus triage (Tranco top 10,000, 2026-10-04).
 * Each test runs one rule through the engine: the case the triage found stays
 * quiet, and the case the rule exists for still reports.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { parseHtml } from "../packages/cli/adapter.ts";
import { run } from "../packages/core/engine.ts";
import { loadRules } from "../packages/rules/load.ts";

const rules = await loadRules();

/** Findings of `ruleId` on a page with `head` and `body`. */
const count = (ruleId: string, head: string, body = ""): number => {
  const rule = rules.filter((r) => r.meta.ruleId === ruleId);
  assert.equal(rule.length, 1, `${ruleId} not found`);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>${head}</head><body>${body}</body></html>`;
  return run(rule, parseHtml(html)).length;
};

test("viewport-value: WebKit's shrink-to-fit and numeric user-scalable are values engines read", () => {
  const vp = (content: string) => count("meta/viewport-value", `<meta name="viewport" content="${content}">`);
  assert.equal(vp("width=device-width, initial-scale=1, shrink-to-fit=no"), 0);
  assert.equal(vp("width=device-width, shrink-to-fit=YES"), 0);
  assert.equal(vp("width=device-width, user-scalable=0"), 0);
  assert.equal(vp("width=device-width, user-scalable=1.5"), 0);
  assert.equal(vp("width=device-width, user-scalable=device-width"), 0);
  assert.equal(vp("width=device-width, user-scalable=maybe"), 1);
  assert.equal(vp("width=device-width, shrink-to-fit=maybe"), 1);
  assert.equal(vp("width=device-width, minimal-ui"), 1);
});

test("referrer-value: origin-when-crossorigin is in HTML's legacy table", () => {
  const ref = (content: string) => count("meta/referrer-value", `<meta name="referrer" content="${content}">`);
  assert.equal(ref("origin-when-crossorigin"), 0);
  assert.equal(ref(" Origin-When-CrossOrigin "), 0);
  assert.equal(ref("bogus"), 1);
});

test("apple-mobile-web-app-status-bar-style: black and black-translucent are live", () => {
  const bar = (attrs: string) => count("meta/apple-mobile-web-app-status-bar-style", `<meta name="apple-mobile-web-app-status-bar-style" ${attrs}>`);
  assert.equal(bar('content="black"'), 0);
  assert.equal(bar('content=" Black-Translucent"'), 0);
  assert.equal(bar('content="default"'), 1);
  assert.equal(bar(""), 1);
  assert.equal(bar('content="white"'), 1);
});

test("fetchpriority-value: an empty value already means auto", () => {
  const img = (attrs: string) => count("attr/fetchpriority-value", "", `<img src="a.png" alt="" ${attrs}>`);
  assert.equal(img('fetchpriority=""'), 0);
  assert.equal(img("fetchpriority"), 0);
  assert.equal(img('fetchpriority="urgent"'), 1);
});

test("base-position: a <base> without href resolves no URL, so its place does not matter", () => {
  assert.equal(count("head/base-position", '<base target="_blank">'), 0);
  assert.equal(count("head/base-position", '<base href="/docs/">'), 1);
});

test("main-multiple: a main under a hidden ancestor or a closed dialog is not a landmark", () => {
  const two = (wrap: (main: string) => string) => count("document/main-multiple", "", `<main>a</main>${wrap("<main>b</main>")}`);
  assert.equal(two((m) => `<div hidden id="S:1">${m}</div>`), 0);
  assert.equal(two((m) => `<dialog><form>${m}</form></dialog>`), 0);
  assert.equal(two((m) => `<dialog open>${m}</dialog>`), 2);
  assert.equal(two((m) => m), 2);
});

test("json-ld-syntax: an empty block is a placeholder with nothing to lose", () => {
  const ld = (text: string) => count("script/json-ld-syntax", `<script type="application/ld+json">${text}</script>`);
  assert.equal(ld(""), 0);
  assert.equal(ld(" \n\t "), 0);
  assert.equal(ld("{bad"), 1);
});

test("preload-as-missing: rel=\"preload stylesheet\" loads the stylesheet anyway", () => {
  assert.equal(count("link/preload-as-missing", '<link rel="preload stylesheet" href="a.css">'), 0);
  assert.equal(count("link/preload-as-missing", '<link rel="preload" href="a.css">'), 1);
});

test("preload-font-crossorigin-missing: as=font on a stylesheet URL is not a font fetch", () => {
  const font = (href: string) => count("link/preload-font-crossorigin-missing", `<link rel="preload" as="font" href="${href}">`);
  assert.equal(font("/fonts.css"), 0);
  assert.equal(font("/fonts.CSS?v=2"), 0);
  assert.equal(font("https://fonts.googleapis.com/css2?family=Inter"), 0);
  assert.equal(font("/inter.woff2"), 1);
});

test("og-name-attribute: a tag that also carries property is read through property", () => {
  assert.equal(count("meta/og-name-attribute", '<meta name="og:title" property="og:title" content="T">'), 0);
  assert.equal(count("meta/og-name-attribute", '<meta name="og:title" content="T">'), 1);
});

test("http-equiv-unregistered-pragmas: onion-location and x-pjax-version have readers", () => {
  const equiv = (value: string) => count("meta/http-equiv-unregistered-pragmas", `<meta http-equiv="${value}" content="x">`);
  assert.equal(equiv("onion-location"), 0);
  assert.equal(equiv("X-PJAX-Version"), 0);
  assert.equal(equiv("bogus-pragma"), 1);
});

test("list-presentational: ol[type] is conforming HTML", () => {
  assert.equal(count("attr/list-presentational", "", '<ol type="A"><li>a</li></ol>'), 0);
  assert.equal(count("attr/list-presentational", "", '<ul type="disc"><li>a</li></ul>'), 1);
  assert.equal(count("attr/list-presentational", "", '<ol><li type="a">a</li></ol>'), 1);
});

test("canonical-relative: surrounding spaces do not make an absolute URL relative", () => {
  const canonical = (attrs: string) => count("link/canonical-relative", `<link rel="canonical" ${attrs}>`);
  assert.equal(canonical('href=" https://example.com/post"'), 0);
  assert.equal(canonical('href="https://example.com/post "'), 0);
  assert.equal(canonical(""), 0, "no href: link/href-missing reports it");
  assert.equal(canonical('href="/post"'), 1);
});

test("hreflang-relative: a URL with a scheme is absolute", () => {
  const alt = (href: string) => count("link/hreflang-relative", `<link rel="alternate" hreflang="en" href="${href}">`);
  assert.equal(alt("android-app://com.example/https/example.com/"), 0);
  assert.equal(alt(" https://example.com/en/"), 0);
  assert.equal(alt("/en/"), 1);
});

test("metadata-position: a canonical inside a <template> is inert, not out of place", () => {
  assert.equal(count("head/metadata-position", '<template><link rel="canonical" href="https://example.com/"></template>'), 0);
  assert.equal(count("head/metadata-position", "", '<link rel="canonical" href="https://example.com/">'), 1);
});
