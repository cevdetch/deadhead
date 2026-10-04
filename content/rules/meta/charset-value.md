---
ruleId: "meta/charset-value"
title: "<meta charset> with non-UTF-8 value"
description: "utf-8 is the single valid HTML encoding; any other label keeps the page on a legacy encoding, or misdescribes UTF-8 bytes."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[charset]:not([charset="utf-8" i]):not([charset=""])'
fix: { op: "none" }
replacement: "Convert the file bytes to UTF-8 first, then declare <meta charset=\"utf-8\">. Never relabel alone."
tags: ["charset"]
impacts: ["interop", "security"]
related: ["head/charset-position", "head/charset-multiple", "meta/http-equiv-content-type"]
---

A `meta` charset value outside ASCII case-insensitive `utf-8` declares a legacy encoding. HTML allows UTF-8 alone, and where the label and the bytes disagree, text decodes into mojibake.

## Why avoid

WHATWG demands an ASCII case-insensitive match for `utf-8`, and declares that the bytes have to be UTF-8 whether a declaration exists or not.

The Encoding Standard orders authors to use UTF-8 with the `utf-8` label, and documents masking attacks born of producer-consumer disagreement over encodings.

A wrong label breaks text: UTF-8 bytes under a legacy label decode into mojibake. A right one still keeps the page on that encoding, which forms submit in and URLs encode queries in, so everything that reads its output has to agree on it.

## Use instead

Convert the bytes, then declare:

```html
<meta charset="utf-8">
```

Convert first with an editor or converter set to UTF-8 output. A label edit without the byte conversion corrupts every non-ASCII character on the page.

## Detectability

Detectable with the selector alone. `meta[charset]` prefilters to declarations, and `:not` with the `i` flag keeps the conforming `utf-8` spelling quiet while every other value trips the rule. An empty value declares no encoding and stays quiet. The check reads the label alone, so it cannot tell a wrong label from a right legacy one: byte truth needs a converter.

## Resources

- [WHATWG HTML: the meta element](https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element): the value has to be an ASCII case-insensitive match for `utf-8`, and the bytes have to be UTF-8 with or without a declaration.
- [Encoding Standard: names and labels](https://encoding.spec.whatwg.org/#names-and-labels): authors have to use UTF-8 with the `utf-8` label, plus the security background on producer-consumer disagreement.
- [MDN: `<meta>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta): UTF-8 is the single valid encoding for HTML5 documents.
