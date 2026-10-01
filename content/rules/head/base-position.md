---
ruleId: "head/base-position"
title: "<base> after other head elements"
description: "Elements before <base> resolve their URLs against the page address, so relative links break; put <base> at the top of <head>."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "head"
match: "logic"
fix: { op: "none" }
replacement: "Move <base> to the top of <head>, after <meta charset> and the viewport tag and before any link, script or style."
tags: ["one-per-page"]
impacts: ["interop"]
related: ["head/base-multiple", "head/charset-position"]
---

A `<base>` that comes after other head elements is too late for them. Elements parsed before it
resolve their URLs against the page address, so a relative stylesheet, script or icon above
`<base>` loads from the wrong place.

## Why avoid

The HTML Standard: "A base element, if it has an href attribute, must come before any other
elements in the tree that have attributes defined as taking URLs." The parser fetches a
`<link rel="stylesheet" href="css/site.css">` when it reaches it, before a later `<base>` has
set the base URL.

capo.js puts `<base>` in its top group with `<meta charset>`, `<meta http-equiv>` and
`<meta name=viewport>`: "To avoid any broken links for resources loaded early in the document,
capo.js recommends placing the `<base>` element in the top position."

## Use instead

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="https://example.com/docs/">
  <title>Guide</title>
  <link rel="stylesheet" href="css/site.css">
</head>
```

## Detectability

The logic in `packages/rules/logic/head/base-position.ts` reports a `<base>` when a head element
outside the capo.js top group comes before it, and names the first one in the detail. A
`<title>` or `<meta name="description">` there breaks no URL, and the rule still reports it, as
capo.js does. A `<base>` at a fragment's top level has no siblings to read and stays quiet.
There is no autofix: the fix moves an element.

## Resources

- [HTML Standard: the base element](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element): `<base href>` comes before every element with a URL attribute.
- [capo.js: rules](https://rviscomi.github.io/capo.js/user/rules/#base): the "Pragma directives" group and `<base>` "in the top position".
