/**
 * The bookmarklet's hand-off to the try page: read the page as its server
 * sent it, fall back to the DOM when that fails, and navigate a tab the click
 * opened. Documents and tabs are plain objects; the vm test in
 * bookmarklet.test.ts runs the bundled button.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { parseHTML } from "linkedom";

import { SITE_URL } from "../../packages/core/vocabulary.ts";
import { decodeHandoff } from "../../packages/browser/handoff.ts";
import { PANEL, readSource, sendToTry, serializeDocument, type Get, type Tab } from "../../packages/browser/send.ts";

const doc = (characterSet = "UTF-8", doctype: object | null = { name: "html", publicId: "", systemId: "" }): Document =>
  ({ characterSet, doctype, documentElement: { cloneNode: () => ({ outerHTML: "<html><head></head><body>dom</body></html>", querySelectorAll: () => [] }) } }) as unknown as Document;
const serve = (body: BodyInit, init?: ResponseInit): Get => async () => new Response(body, init);
const tab = (): Tab & { closed: boolean } => ({ opener: {}, location: { href: "" }, closed: false, close() { this.closed = true; } });

test("serializeDocument: the doctype, public and system ids included, then the root element", () => {
  assert.equal(serializeDocument(doc()), "<!DOCTYPE html>\n<html><head></head><body>dom</body></html>");
  const xhtml = doc("UTF-8", { name: "html", publicId: "-//W3C//DTD XHTML 1.0 Strict//EN", systemId: "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd" });
  assert.match(serializeDocument(xhtml), /^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD XHTML 1\.0 Strict\/\/EN" "http:\/\/www\.w3\.org\/TR\/xhtml1\/DTD\/xhtml1-strict\.dtd">\n<html>/);
  assert.match(serializeDocument(doc("UTF-8", { name: "html", publicId: "", systemId: "about:legacy-compat" })), /^<!DOCTYPE html SYSTEM "about:legacy-compat">\n/);
  assert.equal(serializeDocument(doc("UTF-8", null)), "<html><head></head><body>dom</body></html>");
});

test("serializeDocument: leaves out the panel, which is ours and not the page's, and keeps the live page intact", () => {
  const { document } = parseHTML("<!doctype html><html lang=en><head><title>t</title></head><body><p>page</p></body></html>");
  document.body.append(document.createElement(PANEL));
  assert.equal(serializeDocument(document), '<!DOCTYPE html>\n<html lang="en"><head><title>t</title></head><body><p>page</p></body></html>');
  assert.ok(document.querySelector(PANEL), "the panel stays on the page");
});

test("readSource: the server's bytes, decoded with the page's own encoding", async () => {
  const latin1 = new Uint8Array([0x3c, 0x70, 0x3e, 0xe9, 0x3c, 0x2f, 0x70, 0x3e]); // <p>é</p> in windows-1252
  assert.deepEqual(await readSource(doc("windows-1252"), "https://example.test/", serve(latin1)), { html: "<p>é</p>", source: "raw" });
});

test("readSource: asks for the page itself, with its cookies, from the cache when it can", async () => {
  const seen: [string, RequestInit][] = [];
  await readSource(doc(), "https://example.test/a?b", async (url, init) => (seen.push([url, init]), new Response("x")));
  assert.deepEqual(seen, [["https://example.test/a?b", { credentials: "same-origin", cache: "force-cache" }]]);
});

test("readSource: a blocked request, an error status or a redirect falls back to the DOM", async () => {
  const dom = { html: "<!DOCTYPE html>\n<html><head></head><body>dom</body></html>", source: "dom" };
  const blocked: Get = async () => { throw new TypeError("Failed to fetch"); };
  assert.deepEqual(await readSource(doc(), "https://example.test/", blocked), dom, "connect-src or file:");
  assert.deepEqual(await readSource(doc(), "https://example.test/", serve("denied", { status: 403 })), dom);
  const redirected: Get = async () => ({ ok: true, redirected: true, arrayBuffer: async () => new ArrayBuffer(0) }) as Response;
  assert.deepEqual(await readSource(doc(), "https://example.test/", redirected), dom, "a login wall is another document");
  assert.deepEqual(await readSource(doc("no-such-encoding"), "https://example.test/", serve("x")), dom);
});

test("sendToTry: cuts the opener and sends the tab to the try page with the page in the fragment", async () => {
  const opened = tab();
  assert.equal(await sendToTry(doc(), "https://example.test/p", serve("<p>raw</p>"), opened), null);
  assert.equal(opened.opener, null);
  assert.ok(opened.location.href.startsWith(`${SITE_URL}/try#page=`), opened.location.href);
  const fragment = opened.location.href.slice(opened.location.href.indexOf("#"));
  assert.deepEqual(await decodeHandoff(fragment), { url: "https://example.test/p", html: "<p>raw</p>", source: "raw" });
});

test("sendToTry: a blocked pop-up is a message, not an error", async () => {
  assert.match((await sendToTry(doc(), "https://example.test/", serve("x"), null)) ?? "", /blocked the new tab/);
});

test("sendToTry: a page too large for a link closes the tab and says to open the file instead", async () => {
  const opened = tab();
  const huge = randomBytes(900_000).toString("base64"); // compresses to more than the limit
  const message = await sendToTry(doc(), "https://example.test/", serve(huge), opened);
  assert.match(message ?? "", /too large for a link .* open the file on https:\/\/deadhead\.cevdet\.ch\/try/);
  assert.equal(opened.closed, true);
  assert.equal(opened.location.href, "");
});
