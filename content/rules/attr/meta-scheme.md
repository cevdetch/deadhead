---
ruleId: "attr/meta-scheme"
title: "<meta scheme>"
description: "A scheme qualifier on meta naming the format of the content value; the HTML Standard lists it as non-conforming, so authors must not use it."
pubDate: "2026-09-16"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[scheme]'
fix: { op: "remove-attribute", attr: "scheme" }
replacement: "Drop the scheme qualifier and keep the name/content pair."
tags: ["structured-data"]
impacts: ["maintainability"]
related: []
---

`<meta scheme>` names the format of a `content` value, and no browser reads it. The HTML
Standard lists it as non-conforming. Drop the qualifier and keep the `name`/`content` pair.

`scheme` came with HTML 4.01's metadata profiles. A `<meta name="identifier" scheme="ISBN">`
told a reader which encoding the value used, so that the same name could hold an ISBN on one
page and a URN on another. Dublin Core's HTML conventions and government metadata standards such
as the UK's eGMS used it in that sense, read by their own harvesters, not by browsers.

## Why avoid

The HTML Standard lists `scheme` on `meta` elements as obsolete, with its replacement: "Use only
one scheme per field, or make the scheme declaration part of the value." For implementations it
adds that user agents "are encouraged to ignore the scheme attribute and instead process the
value given to the metadata name as if it had been specified for each expected value of the
scheme attribute". A `scheme` IDL attribute remains on `HTMLMetaElement` for script, and MDN
marks it deprecated.

Nothing in a browser changes with or without it, and validators report it as a conformance
error. The metadata it qualifies is only as useful as the reader that understands the name; for
that reader, a value that carries its own format is easier to parse than a pair of attributes.

## Use instead

Drop the qualifier. Where a reader needs the format, give the field a name that implies one
scheme, or put the scheme into the value:

```html
<!-- Before -->
<meta name="identifier" content="1580081754" scheme="ISBN">

<!-- After: the format is part of the value -->
<meta name="identifier" content="urn:isbn:1580081754">
```

For metadata that search engines and other consumers read today, structured data such as JSON-LD
with a schema.org type carries the format in its property names, for example `isbn` on a `Book`.
`meta/dublin-core-without-schema` covers Dublin Core names that rely on a profile.

## Detectability

Detectable with one selector: `meta[scheme]`. Any value trips the rule, whatever the string. The
CLI, the bookmarklet and the ESLint plugin report the same findings, and none skips. The fix
removes the `scheme` attribute and the whitespace before it. The `name`/`content` pair stays, so
the metadata survives; folding the scheme into the value is a change for the author to make.

## Resources

- [HTML Standard: `scheme` on `meta`](https://html.spec.whatwg.org/multipage/obsolete.html#attr-meta-scheme): "Use only one scheme per field, or make the scheme declaration part of the value"; user agents "are encouraged to ignore the scheme attribute".
- [DCMI: Expressing Dublin Core metadata using HTML/XHTML meta and link elements (2008)](https://www.dublincore.org/specifications/dublin-core/dc-html/2008-08-04/): examples such as `<meta name="DCTERMS.modified" scheme="XSD.date" content="2007-07-22">`.
- [MDN: `HTMLMetaElement.scheme`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMetaElement/scheme): marked deprecated, not for new pages.
- [W3C HTML markup: meta](https://www.w3.org/TR/2011/WD-html-markup-20110113/meta.html): the `scheme` attribute is obsolete, with the make-the-scheme-part-of-the-value guidance.
