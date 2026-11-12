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

The markup gives no hint. A template can write `</head>` well below the stray element, and the
source still reads as one head. The browser builds another tree: open the Elements panel in
DevTools and the canonical sits in `<body>`, after the element that ended the head.

## Why avoid

Google: "Once Google detects one of these invalid elements, it assumes the end of the `<head>`
element and stops reading any further elements in the `<head>` element." And: "The
rel="canonical" link element is only accepted if it appears in the `<head>` section of the
HTML." The HTML parser does the same: in the head, any element outside the head-content list
closes the head and lands in the body. Duplicate URLs stop consolidating and language versions
drop out, with no visible sign.

Google lists the elements it reads in the head: `title`, `meta`, `link`, `script`, `style`,
`base`, `noscript` and `template`. Everything else ends it, and the element that does can be one
the page author never wrote:

- a tracking pixel or consent banner pasted as an `<img>` or `<div>`;
- an `<iframe>` embed placed in the head;
- a custom element, such as a web component's `<my-widget>`, which the parser treats as any
  other unknown element;
- stray text, such as a character left over in a template.

A `<noscript>` holding an `<img>` is a different case. With scripting enabled, the parser reads
the contents of a `<noscript>` in the head as raw text, and the head stays open. With scripting
disabled, the same `<img>` ends the head.

The rule covers canonical and hreflang links because Google documents both as head elements and
the cost of losing them is high: a moved canonical is a missing one to Google, which then picks
the canonical URL from its other signals.

## Use instead

Keep the head to head content and move everything else into the body. Where the order in the
head cannot change, put the canonical and hreflang links above the first element that does not
belong:

```html
<!-- Before: the <img> ends the head, and the canonical lands in <body> -->
<head>
  <meta charset="utf-8">
  <title>Guide</title>
  <img src="/pixel.gif" alt="">
  <link rel="canonical" href="https://example.com/guide">
</head>

<!-- After -->
<head>
  <meta charset="utf-8">
  <title>Guide</title>
  <link rel="canonical" href="https://example.com/guide">
</head>
<body>
  <img src="/pixel.gif" alt="">
</body>
```

Both annotations also have channels outside the markup. Google reads hreflang from an HTTP
`Link` header and from the sitemap, and documents a `Link: <url>; rel="canonical"` header, with
a PDF as its example. A server that sends these is safe from whatever a script or plugin writes
into the head. Whatever the channel, keep the values in agreement: Google warns against
specifying different canonical URLs through different methods.

## Detectability

The logic in `packages/rules/logic/head/metadata-position.ts` reports a canonical or hreflang
link that sits outside `<head>`, the tree parse5 and the DOM build, or after a head child that
is not head content, the tree `@html-eslint/parser` builds. Both name the element that closed
the head. The list of head content follows the parser, which also keeps the obsolete `basefont`,
`bgsound` and `noframes`; Google's list leaves those out. Stray text closes the head too; the
port sees no text, so that case reports in the CLI and the bookmarklet and not in ESLint. The
CLI and the bookmarklet parse with scripting enabled, and in ESLint the head child is the
`<noscript>` itself, so a `<noscript>` in the head never trips the rule. Fragments and
`<template>` contents, which are inert, are skipped. There is no autofix.

## Resources

- [Google Search Central: valid page metadata](https://developers.google.com/search/docs/crawling-indexing/valid-page-metadata): the valid head elements, and Google stops reading the head at the first invalid element, naming `iframe` and `img`.
- [Google Search Central: consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): `rel="canonical"` "is only accepted if it appears in the `<head>` section"; the `Link` header; "Don't specify different URLs as canonical for the same page using different canonicalization techniques".
- [Google Search Central: localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions): hreflang in HTML, in HTTP headers and in the sitemap.
- [HTML Standard: the "in head" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead): any other element closes the head and moves to the body; a `<noscript>` is raw text with scripting enabled and switches to "in head noscript" without it.
