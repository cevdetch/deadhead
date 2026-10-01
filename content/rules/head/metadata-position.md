---
ruleId: "head/metadata-position"
title: "Canonical or hreflang link after the head ends"
description: "An element that does not belong in <head> closes it; Google ignores canonical and hreflang links after that point."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Move the element that ended the head into <body>, or the canonical and hreflang links above it."
tags: ["search"]
impacts: ["seo"]
related: ["link/canonical-relative", "link/hreflang-relative", "head/canonical-multiple"]
---

A canonical or hreflang link that comes after an element that does not belong in `<head>` is
ignored. An `<img>`, `<div>` or `<iframe>` in the head closes it: the parser moves everything
after it into `<body>`, and Google stops reading there.

## Why avoid

Google: "Once Google detects one of these invalid elements, it assumes the end of the `<head>`
element and stops reading any further elements in the `<head>` element." And: "The
rel="canonical" link element is only accepted if it appears in the `<head>` section of the
HTML." The HTML parser does the same: in the head, any element outside the head-content list
closes the head and lands in the body. Duplicate URLs stop consolidating and language versions
drop out, with no visible sign.

## Use instead

```html
<head>
  <meta charset="utf-8">
  <title>Guide</title>
  <link rel="canonical" href="https://example.com/guide">
</head>
<body>
  <img src="/pixel.gif" alt="">
</body>
```

## Detectability

The logic in `packages/rules/logic/head/metadata-position.ts` reports a canonical or hreflang
link that sits outside `<head>`, the tree parse5 and the DOM build, or after a head child that
is not head content, the tree `@html-eslint/parser` builds. Both name the element that closed
the head. Stray text closes the head too; the port sees no text, so that case reports in
the CLI and the bookmarklet and not in ESLint. Fragments are skipped. There is no autofix.

## Resources

- [Google Search Central: valid page metadata](https://developers.google.com/search/docs/crawling-indexing/valid-page-metadata): Google stops reading the head at the first invalid element.
- [Google Search Central: consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): `rel="canonical"` "is only accepted if it appears in the `<head>` section".
- [HTML Standard: the "in head" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead): any other element closes the head and moves to the body.
