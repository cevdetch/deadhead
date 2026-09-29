import assert from "node:assert/strict";
import test from "node:test";

import { resourceUrls } from "../site/src/lib/citations.ts";

const body = `Intro with [a link](https://example.com/intro).

## Why avoid

[Not a resource](https://example.com/why).

## Resources

- [HTML Standard](https://html.spec.whatwg.org/multipage/semantics.html#meta-color-scheme): "quoted".
- [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/color-scheme): text, and [a second link](https://example.com/second) in the same item.
`;

test("resourceUrls reads the links of the Resources section alone, in order", () => {
  assert.deepEqual(resourceUrls(body), [
    "https://html.spec.whatwg.org/multipage/semantics.html#meta-color-scheme",
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/color-scheme",
    "https://example.com/second",
  ]);
});

test("resourceUrls returns nothing without a Resources section", () => {
  assert.deepEqual(resourceUrls("## Why avoid\n\n[x](https://example.com)\n"), []);
});

test("resourceUrls keeps balanced parentheses inside a URL", () => {
  const md = "## Resources\n\n- [Microsoft](https://learn.microsoft.com/en-us/previous-versions/cc304073(v=vs.85)): archived.\n- [MDN](https://developer.mozilla.org/x)\n";
  assert.deepEqual(resourceUrls(md), [
    "https://learn.microsoft.com/en-us/previous-versions/cc304073(v=vs.85)",
    "https://developer.mozilla.org/x",
  ]);
});
