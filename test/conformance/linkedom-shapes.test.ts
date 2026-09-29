/**
 * linkedom shapes the DOM adapter leans on.
 *
 * A linkedom bump that moves template children out of `content`, lowercases
 * `tagName`, or lowercases the doctype name must fail here, not as a silent
 * drift where the DOM adapter reports what parse5 cannot see.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { parseHTML } from "linkedom";

import { fromDocument } from "../../packages/browser/adapter.ts";
import type { ElementPort } from "../../packages/core/types.ts";

test("template children sit behind content", () => {
  const { document } = parseHTML(
    '<!doctype html><html lang="en"><head><title>t</title></head><body><template><span>x</span></template></body></html>',
  );
  const template = document.querySelector("template") as unknown as {
    content?: { children?: { length: number } };
    children?: { length: number };
  } | null;
  assert.ok(template, "expected a <template>");
  assert.ok(template.content, "template needs a content fragment");
  assert.ok(
    (template.content.children?.length ?? 0) > 0,
    "template content must hold the parsed markup",
  );

  // The adapter steps into content, so it sees the span either way.
  const parsed = fromDocument(document);
  const seen: string[] = [];
  const walk = (port: ElementPort): void => {
    seen.push(port.tag);
    for (const child of port.children()) walk(child);
  };
  for (const root of parsed.roots) walk(root);
  assert.ok(seen.includes("template"), "adapter must visit <template>");
  assert.ok(seen.includes("span"), "adapter must step into template content");
});

test("tagName keeps the author's case; the port lowercases", () => {
  const { document } = parseHTML(
    '<!doctype html><html lang="en"><head><title>t</title></head><body><DIV id="a"></DIV></body></html>',
  );
  const div = document.querySelector("div");
  assert.ok(div, "expected a div");
  assert.equal(div.tagName, "DIV", "linkedom keeps tagName uppercase");
  const parsed = fromDocument(document);
  const ports = parsed.doc.querySelectorAll("div");
  assert.equal(ports.length, 1);
  assert.equal(ports[0]?.tag, "div");
});

test("the doctype keeps the author's case; the port lowercases", () => {
  const { document } = parseHTML(
    '<!DOCTYPE HTML><html lang="en"><head><title>t</title></head><body></body></html>',
  );
  assert.equal(document.doctype?.name, "HTML", "linkedom keeps the author's case");
  const doctype = fromDocument(document).doc.doctype();
  assert.ok(doctype, "expected a doctype");
  assert.equal(doctype.name, "html");
  assert.equal(doctype.tag, "!doctype");
  assert.deepEqual([doctype.range(), doctype.loc()], [null, null], "DOM has no positions");
});
