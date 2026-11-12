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

A `meta` charset value outside ASCII case-insensitive `utf-8` declares a legacy encoding. HTML
allows UTF-8 alone, and where the label and the bytes disagree, text decodes into mojibake.

The common values are `iso-8859-1`, `windows-1252`, `shift_jis`, `gb2312` and `euc-kr`, left
from pages written before UTF-8 took over, and `utf8` without the hyphen. Browsers resolve
labels through the Encoding Standard's table, so some of these map to an encoding other than the
name suggests: `iso-8859-1`, `latin1` and `ascii` all decode as `windows-1252`.

## Why avoid

The HTML Standard: "If the attribute is present, its value must be an ASCII case-insensitive
match for the string "utf-8"", and the document has to be encoded as UTF-8 with or without a
declaration. The Encoding Standard: "Authors must use the UTF-8 encoding and must use its (ASCII
case-insensitive) "utf-8" label to identify it." It also describes the masking attacks that come
from a producer and a consumer disagreeing about an encoding.

A wrong label breaks text: UTF-8 bytes under a legacy label decode into mojibake, so `café`
shows as `cafÃ©`. A right one still keeps the page on that encoding, and the encoding reaches
further than the text on screen. Forms submit in the page's encoding, and characters that
encoding cannot represent are sent as numeric character references, so a name typed in Greek on
a `windows-1252` page arrives as `&#945;…`. The query part of URLs in the page is encoded in the
page's encoding. Every system that reads the page's output has to agree on it.

`utf8` without the hyphen is a different case, as are the other UTF-8 labels such as
`unicode-1-1-utf-8`: the Encoding Standard maps them to UTF-8, so the browser decodes the page
as intended. They are still non-conforming, and they are the values here that are safe to
relabel without touching the bytes.

## Use instead

Convert the bytes, then declare:

```html
<!-- Before: a legacy label -->
<meta charset="windows-1252">

<!-- After: the file re-saved as UTF-8 -->
<meta charset="utf-8">
```

Convert first with an editor or converter set to UTF-8 output, such as
`iconv -f windows-1252 -t utf-8 page.html > page.utf8.html`. A label edit without the byte
conversion corrupts every non-ASCII character on the page. Check the server too: a `charset` in
the HTTP `Content-Type` header overrides the `meta`, so it has to say `utf-8` as well. Data the
page sends elsewhere, such as form submissions stored in a database, has to move to UTF-8 at the
same time, or old and new records stop matching.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `meta[charset]` prefilters to declarations, and `:not` with the
`i` flag keeps the conforming `utf-8` spelling quiet while every other value trips the rule,
`utf8` included. An empty value declares no encoding and stays quiet. The check reads the label
alone, so it cannot tell a wrong label from a right legacy one: byte truth needs a converter.
There is no autofix: a new label without converted bytes breaks the page.

## Resources

- [WHATWG HTML: the meta element](https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element): the value has to be an ASCII case-insensitive match for `utf-8`, and the bytes have to be UTF-8 with or without a declaration.
- [Encoding Standard: names and labels](https://encoding.spec.whatwg.org/#names-and-labels): "Authors must use the UTF-8 encoding and must use its (ASCII case-insensitive) "utf-8" label to identify it"; the label table, where `utf8` is a UTF-8 label and `iso-8859-1`, `latin1` and `ascii` map to `windows-1252`; the security background on producer-consumer disagreement.
- [WHATWG HTML: form submission](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#selecting-a-form-submission-encoding): the form's encoding defaults to the document's character encoding.
- [MDN: `<meta>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta): UTF-8 is the single valid encoding for HTML5 documents.
