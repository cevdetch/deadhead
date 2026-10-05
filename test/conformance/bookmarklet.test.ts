/**
 * The bookmarklet is built by a bundler written for this repo, so it needs the
 * same scrutiny as the adapters: the artifact must behave exactly like the
 * modules it was built from, or "runs the same rule set" is a claim rather
 * than a fact.
 *
 * The bundle is executed in a `vm` context whose only DOM is linkedom's, which
 * is as close to a page as this suite can get without a browser.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

import { parseHTML } from "linkedom";

import { fromDocument } from "../../packages/browser/adapter.ts";
import { collectFiles } from "../../packages/cli/lint.ts";
import { loadRules } from "../../packages/rules/load.ts";
import { run } from "../../packages/core/index.ts";
import type { Finding } from "../../packages/core/types.ts";
import { bundleBookmarklet } from "../../scripts/build-bookmarklet.ts";
import { decodeHandoff } from "../../packages/browser/handoff.ts";
import { SITE_URL } from "../../packages/core/vocabulary.ts";

const rulesJson = JSON.parse(
  await readFile(new URL("../../packages/rules/rules.json", import.meta.url), "utf8"),
);
const bundle = await bundleBookmarklet(rulesJson.rules);
const rules = await loadRules();

/** Run the built artifact against a document, the way a bookmarklet would. */
const viaBundle = async (source: string): Promise<{ findings: Finding[]; panel: boolean }> => {
  const { window, document } = parseHTML(source);
  const findings = [
    ...(await vm.runInNewContext(bundle, { document, window, DecompressionStream, Blob, Response, atob, TextDecoder }) as Finding[]),
  ];
  return { findings, panel: document.querySelector("deadhead-panel") !== null };
};

const viaModules = (source: string): Finding[] =>
  run(rules, fromDocument(parseHTML(source).document));

test("the bundle finds exactly what the modules find, on every fixture", async () => {
  const files = await collectFiles(["test/fixtures"]);
  assert.ok(files.length > 0);
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.deepEqual(
      (await viaBundle(source)).findings.map((f) => f.ruleId),
      viaModules(source).map((f) => f.ruleId),
      file,
    );
  }
});

test("the bundle carries every rule, including the ones that need code", async () => {
  // The metadata rides gzipped, so rule ids are not plain text in the bundle
  // outside the logic map. Inflate the payload and compare the id sets.
  const payload = bundle.match(/\.start\("([^"]+)",/)?.[1];
  assert.ok(payload, "no start payload in the bundle");
  const { gunzipSync } = await import("node:zlib");
  const metas = JSON.parse(gunzipSync(Buffer.from(payload, "base64")).toString("utf8"));
  assert.deepEqual(
    metas.map((m: { ruleId: string }) => m.ruleId).sort(),
    rules.map((r) => r.meta.ruleId).sort(),
  );
  // The logic modules must be inlined too, not merely referenced. Rolldown
  // minifies internal identifiers, so assert on the assembly's stable wiring:
  // the logic map reaching each inlined entry by rule id.
  assert.ok(bundle.includes(JSON.stringify("attr/script-type-javascript")), "script logic missing");
  assert.ok(bundle.includes(JSON.stringify("head/charset-position")), "charset logic missing");
});

test("nothing in the bundle can be blocked by a Content-Security-Policy", () => {
  // The point of inlining everything: a page worth inspecting is often a page
  // with a strict CSP, and a request on load would make the tool useless
  // exactly where it is most useful. The one request is the full report
  // button's, on click, and it falls back to the DOM when blocked; the click
  // test below asserts that loading makes none.
  for (const forbidden of ["XMLHttpRequest", "importScripts", "eval("]) {
    assert.ok(!bundle.includes(forbidden), `bundle references ${forbidden}`);
  }
  assert.doesNotMatch(bundle, /\bimport\s*\(/, "bundle uses a dynamic import");
  assert.doesNotMatch(bundle, /^\s*(?:import|export)\s/m, "bundle still has module syntax");
});

test("the bundle contains nothing CSP or Trusted Types can block", () => {
  for (const banned of ["innerHTML", 'createElement("style")', "createElement('style')", "eval(", "new Function", "import("]) {
    assert.equal(bundle.includes(banned), false, `bundle contains ${banned}`);
  }
});

test("the panel lives in a shadow root and adopts a constructed stylesheet", async () => {
  const { window, document } = parseHTML("<!doctype html><html lang=en><head><title>x</title></head><body></body></html>");
  const adopted: unknown[] = [];
  class CSSStyleSheet { replaceSync(_css: string): void {} }
  // linkedom has attachShadow but no adoptedStyleSheets; a browser has both.
  const proto = Object.getPrototypeOf(document.createElement("div").attachShadow({ mode: "open" }));
  Object.defineProperty(proto, "adoptedStyleSheets", { configurable: true, get: () => adopted, set: (v: unknown[]) => { adopted.splice(0, adopted.length, ...v); } });
  await vm.runInNewContext(bundle, { document, window, CSSStyleSheet, DecompressionStream, Blob, Response, atob, TextDecoder });
  const host = document.querySelector("deadhead-panel");
  assert.ok(host, "no panel host");
  assert.ok((host as unknown as { shadowRoot: unknown }).shadowRoot, "no shadow root");
  assert.equal(adopted.length, 1);
});

test("the panel pins a light color scheme, so a dark page cannot blank the close button", async () => {
  const { window, document } = parseHTML(
    '<!doctype html><html lang=en><head><meta name="color-scheme" content="dark light"><title>x</title></head><body></body></html>',
  );
  let css = "";
  class CSSStyleSheet { replaceSync(text: string): void { css = text; } }
  const proto = Object.getPrototypeOf(document.createElement("div").attachShadow({ mode: "open" }));
  Object.defineProperty(proto, "adoptedStyleSheets", { configurable: true, get: () => [], set: () => {} });
  await vm.runInNewContext(bundle, { document, window, CSSStyleSheet, DecompressionStream, Blob, Response, atob, TextDecoder });
  const rules = new Map([...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => [selector!.trim(), body!.replace(/\s/g, "")]));
  // Browser-default colours (button text, scrollbars) follow the used color
  // scheme. The panel paints white, so a page declaring dark must not reach it.
  assert.match(rules.get("section") ?? "", /(^|;)color-scheme:light(;|$)/);
  // The button paints its own background, so it names its own text colour.
  assert.match(rules.get("button") ?? "", /(^|;)color:/);
});

test("it renders a panel, and running it twice does not stack panels", async () => {
  const source = "<!doctype html><html lang='en'><head><title>t</title><meta name='viewport' content='width=device-width'>" +
    '<meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body></body></html>';
  const { window, document } = parseHTML(source);
  const context = { document, window, DecompressionStream, Blob, Response, atob, TextDecoder };
  await vm.runInNewContext(bundle, context);
  await vm.runInNewContext(bundle, context);
  assert.equal(document.querySelectorAll("deadhead-panel").length, 1);
  const host = document.querySelector("deadhead-panel") as unknown as { shadowRoot: { innerHTML: string } | null };
  assert.ok(host.shadowRoot, "no shadow root");
  assert.match(host.shadowRoot?.innerHTML ?? "", /1 finding/);
});

test("a clean document says so rather than showing an empty list", async () => {
  const source = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    "<title>t</title><meta name='viewport' content='width=device-width'></head><body></body></html>";
  const { findings, panel } = await viaBundle(source);
  // Compare length, not the array: values crossing a vm realm boundary have a
  // different Array prototype and deepStrictEqual compares prototypes.
  assert.equal(findings.length, 0);
  assert.ok(panel);
});

const until = async (done: () => boolean): Promise<void> => {
  for (let i = 0; i < 400 && !done(); i++) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(done(), "timed out");
};

test("running it makes no request; the full report button reads the page once and opens it on the try page", async () => {
  const source = "<!doctype html><html lang=en><head><title>t</title></head><body></body></html>";
  const { window, document } = parseHTML(source);
  const requests: string[] = [];
  const fetch = async (url: string): Promise<Response> => (requests.push(url), new Response(source));
  const tab = { opener: {} as unknown, location: { href: "" }, close(): void {} };
  (window as unknown as { open: () => unknown }).open = () => tab;
  const location = { href: "https://example.test/page" };
  await vm.runInNewContext(bundle, { document, window, location, fetch, CompressionStream, DecompressionStream, Blob, Response, atob, btoa, TextDecoder, TextEncoder });
  assert.deepEqual(requests, [], "the panel loads nothing");
  const root = (document.querySelector("deadhead-panel") as unknown as { shadowRoot: ParentNode }).shadowRoot;
  const button = [...root.querySelectorAll("button")].find((b) => b.textContent === "full report");
  assert.ok(button, "no full report button");
  button.dispatchEvent(new window.Event("click"));
  await until(() => tab.location.href !== "");
  assert.deepEqual(requests, ["https://example.test/page"]);
  assert.equal(tab.opener, null);
  assert.ok(tab.location.href.startsWith(`${SITE_URL}/try#page=`));
  const handed = await decodeHandoff(tab.location.href.slice(tab.location.href.indexOf("#")));
  assert.deepEqual(handed, { url: "https://example.test/page", html: source, source: "raw" });
});
