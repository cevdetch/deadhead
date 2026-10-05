/**
 * The link-fragment codec shared by the try page's share link and the
 * bookmarklet's hand-off. It must stay import-free: the site, the bookmarklet
 * bundle and Node all load it as is.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { decodeHandoff, encodeHandoff, HANDOFF_LIMIT, pack, unpack } from "../packages/browser/handoff.ts";

test("handoff: a page survives the round trip, Unicode included", async () => {
  const page = { url: "https://example.test/ä?q=1#x", html: "<!doctype html><title>日本語</title>", source: "raw" as const };
  const fragment = await encodeHandoff(page);
  assert.match(fragment, /^#page=[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeHandoff(fragment), page);
});

test("handoff: anything but a well-formed page yields null", async () => {
  assert.equal(await decodeHandoff(""), null);
  assert.equal(await decodeHandoff("#html=" + (await pack("<p>"))), null, "a share link is not a hand-off");
  assert.equal(await decodeHandoff("#page=not*base64"), null);
  assert.equal(await decodeHandoff("#page=" + (await pack("not json"))), null);
  assert.equal(await decodeHandoff("#page=" + (await pack('{"url":"u","html":"h","source":"cache"}'))), null);
  assert.equal(await decodeHandoff("#page=" + (await pack('{"url":1,"html":"h","source":"raw"}'))), null);
  assert.equal(await decodeHandoff("#page=" + (await pack("null"))), null);
});

test("pack and unpack: base64url text, null on anything that is not a deflate stream", async () => {
  assert.equal(await unpack(await pack("a b&c")), "a b&c");
  assert.equal(await unpack("AAAA"), null);
  assert.equal(await unpack("A"), null, "a length atob rejects");
  assert.equal(await unpack(""), null);
});

test("the limit stays under Firefox's 1,048,576-character URL cap", () => {
  assert.ok(HANDOFF_LIMIT + "https://deadhead.cevdet.ch/try".length < 1_048_576);
});

test("the codec stays import-free so the site and the bookmarklet can both load it", async () => {
  const source = await readFile(new URL("../packages/browser/handoff.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /import\s*\(/);
});
