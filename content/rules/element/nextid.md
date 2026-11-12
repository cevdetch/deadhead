---
ruleId: "element/nextid"
title: "<nextid>"
description: "nextid is an unknown element; name targets with unique id attributes instead."
pubDate: "2026-09-14"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: 'nextid'
fix: { op: "none" }
replacement: "Identify elements with unique `id` attributes."
tags: ["hyperlinks"]
impacts: ["maintainability"]
related: ["element/isindex"]
---

`<nextid>` identifies nothing. It is a leftover from the web's first years: an empty `head`
element whose `n` attribute handed the next document identifier to editors that numbered anchors
automatically. The HTML Standard lists it under non-conforming features with the direction "Use
GUIDs instead", and W3C's HTML5 author guidance says the same.

Even HTML 2.0 kept it only as history. RFC 1866, in 1995: "The `<NEXTID>` element is included
for historical reasons only. HTML documents should not contain `<NEXTID>` elements." It "gives a
hint for the name to use for a new `<A>` element when editing an HTML document", as in
`<NEXTID N=Z27>`. The editors that wrote it are long gone; the tag survives in pages that were
never rewritten.

## Why avoid

It is entirely obsolete and must not be used by authors, and no browser does anything with it.
The HTML Standard maps `nextid` to `HTMLUnknownElement`, the interface for names it does not
define, and gives it no rendering or behaviour.

It also changes the tree. `nextid` is not a void element and not head content, so the HTML
parser treats it as it treats any unknown tag in the head: it closes the head, moves the element
and everything after it into `<body>`, and keeps it open until its end tag. A `<nextid n="z27">`
with no end tag swallows the content that follows it. Elements placed after it in the head, such
as a canonical link, land in the body too, where search engines that stop reading the head at
the first invalid element no longer see them (see `head/metadata-position`).

Unique `id` attributes are the replacement on every engine. They identify elements for fragment
links, labels and scripting: everything the automatic numbering was for, without a dead tag.

## Use instead

Delete the element, and give each element that needs an identifier its own `id`:

```html
<!-- Before -->
<head>
  <title>Report</title>
  <nextid n="z27">
</head>

<!-- After -->
<head>
  <title>Report</title>
</head>
<body>
  <section id="report-2026">
    <h2>Report</h2>
  </section>
</body>
```

The HTML Standard's suggestion, GUIDs, fits generated identifiers that must never collide, such
as `id="a3f1c9e2-7b4d-4e8f-9c0a-2d5f6b7e8a9c"`. For identifiers people link to, a readable slug
works as well, as long as it is unique in the document. An `id` that starts with a digit is
valid HTML; in a CSS selector it needs escaping, so a letter first is easier to style.

## Detectability

Detectable with the selector alone. The rule matches the bare element name `nextid`; no logic
module is needed. The CLI, the bookmarklet and the ESLint plugin report the same findings, and
none skips. The scope is `any` deliberately: browsers and parse5 move the element into `<body>`,
while `@html-eslint/parser` keeps the tree as written, with the element in `<head>`. A
head-scoped rule would diverge between adapters; `any` reports it once wherever it lands. All
three adapters agree on a closed `<nextid></nextid>` as the last element of `head`, down to
identical source positions in the source-backed adapters.

There is no autofix. An unclosed `<nextid>` contains the content after it, so removal is not
reliably a pure deletion, and the fix op is `none`.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `nextid` is entirely obsolete; "Use GUIDs instead."
- [HTML Standard: elements in the DOM](https://html.spec.whatwg.org/multipage/dom.html#elements-in-the-dom): `nextid` is among the names that return `HTMLUnknownElement`.
- [HTML Standard: the "in head" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead): any other start tag closes the head and is reprocessed in the body.
- [RFC 1866: HTML 2.0, section 5.2.6](https://www.rfc-editor.org/rfc/rfc1866#section-5.2.6): `NEXTID` "included for historical reasons only".
- [W3C HTML5: Edition for Web Authors: Obsolete features](https://www.w3.org/TR/2011/WD-html5-author-20110809/obsolete.html): independent W3C list with the same verdict and replacement.
