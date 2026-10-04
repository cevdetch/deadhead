/**
 * The ESLint adapter decodes character references itself, because
 * es-html-parser returns attribute values and text as written. parse5 is the
 * reference: it implements the HTML tokenizer, and the CLI adapter uses it.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { type DefaultTreeAdapterTypes, parseFragment } from "parse5";

import { decodeAttribute, decodeText } from "../packages/eslint-plugin/char-refs.ts";
import { ENTITIES } from "../packages/eslint-plugin/entities.ts";

type Element = DefaultTreeAdapterTypes.Element;

/** parse5's reading of `value` as the text of a `<p>`. */
const parse5Text = (value: string): string => {
  const p = parseFragment(`<p>${value}</p>`).childNodes[0] as Element;
  return p.childNodes.map((n) => ("value" in n ? n.value : "")).join("");
};

/** parse5's reading of `value` as a double-quoted attribute value. */
const parse5Attribute = (value: string): string => {
  const a = parseFragment(`<a title="${value}"></a>`).childNodes[0] as Element;
  return a.attrs.find((attr) => attr.name === "title")?.value ?? "";
};

test("char refs: every named reference decodes as parse5 decodes it", () => {
  const names = Object.keys(ENTITIES);
  assert.equal(names.length, 2231, "the WHATWG table has 2,231 entries");
  for (const name of names) {
    assert.equal(decodeText(`&${name}`), parse5Text(`&${name}`), `text &${name}`);
    assert.equal(decodeAttribute(`&${name}`), parse5Attribute(`&${name}`), `attribute &${name}`);
  }
});

test("char refs: the tokenizer's edge cases, in text and in attributes", () => {
  const cases = [
    "text&#x2F;javascript",
    "text&sol;javascript",
    "a &amp; b",
    "&#X2f&#47",
    "&#65",
    "&notit;",
    "&notin;",
    "&amp",
    "&ampx",
    "&copy=2",
    "?a=1&copy=2",
    "?a=1&copyx",
    "&copy x",
    "&unknown;",
    "& b",
    "&",
    "&#;",
    "&#x;",
    "&#xg;",
    "&#0;",
    "&#x110000;",
    "&#99999999999999999999;",
    "&#xD800;",
    "&#128;",
    "&#x81;",
    "&#x9F;",
    "&#13;",
    "&NotEqualTilde;",
    "&&amp;&",
    "x&lt;y&gt;z",
  ];
  for (const value of cases) {
    assert.equal(decodeText(value), parse5Text(value), `text ${JSON.stringify(value)}`);
    assert.equal(decodeAttribute(value), parse5Attribute(value), `attribute ${JSON.stringify(value)}`);
  }
});

test("char refs: a legacy name stays literal in an attribute before = or an alphanumeric", () => {
  assert.equal(decodeAttribute("?a=1&copy=2"), "?a=1&copy=2");
  assert.equal(decodeAttribute("&notit;"), "&notit;");
  assert.equal(decodeText("&notit;"), "¬it;");
  assert.equal(decodeAttribute("&copy x"), "© x");
});

test("char refs: a value without an ampersand is returned as is", () => {
  const value = "text/javascript";
  assert.equal(decodeAttribute(value), value);
  assert.equal(decodeText(value), value);
});
