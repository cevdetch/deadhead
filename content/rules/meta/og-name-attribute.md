---
ruleId: "meta/og-name-attribute"
title: "<meta name> Open Graph vocabulary"
description: "Open Graph vocabularies in name instead of property stay invisible to preview parsers."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "community"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name^="og:" i]:not([property]), meta[name^="fb:" i]:not([property]), meta[name^="article:" i]:not([property]), meta[name^="book:" i]:not([property]), meta[name^="music:" i]:not([property]), meta[name^="video:" i]:not([property]), meta[name^="profile:" i]:not([property])'
fix: { op: "none" }
replacement: "Move the value to property: <meta property=\"og:title\" content=\"The title\">. Re-test the card in the preview debugger afterwards."
tags: ["social"]
impacts: ["seo"]
related: ["meta/http-equiv-metadata-names"]
---

A `meta` tag carrying an Open Graph vocabulary in `name` is outside the protocol. Open Graph is
written with `property`, the attribute the protocol and Facebook document, and the keyword
registry marks the `name` form incomplete.

Open Graph tags describe a page for link previews: the title, description, image and type a
social network or chat app shows when someone shares the URL. The protocol builds them on RDFa,
whose attribute is `property`; HTML's own `meta` names use `name`. Mixing the two is easy, since
both carry `content` and other preview tags, such as the `twitter:` cards, use `name`.

## Why avoid

ogp.me builds the protocol on RDFa `property` tags. Every example on the page, from basic
metadata to verticals, spells `property`, never `name`. Facebook's sharing documentation, for
the crawler that defined the protocol, does the same.

The WHATWG keyword registry lists the `og:` and `fb:` names as incomplete proposals, with the
note: "The spec specifies this to be a value of the property attribute--not a meta keyword". A
`name`-form tag is not a registered metadata name either, so it carries no meaning in HTML.

Some consumers read it anyway, and that is the trap. A lenient parser such as the
open-graph-scraper package falls back to `name` when `property` is absent, so a preview built
with it looks right, and a consumer that follows the protocol finds no tags and falls back to
scraped headings and images. Whether the card works depends on who renders it, and none of them
reports the problem: no parser errors, no console warning. The author sees one good card and
assumes the tags work everywhere.

## Use instead

The `property` form, matching the protocol:

```html
<!-- Before -->
<meta name="og:title" content="How to deadhead roses">
<meta name="og:image" content="https://example.com/roses.jpg">

<!-- After -->
<meta property="og:title" content="How to deadhead roses">
<meta property="og:image" content="https://example.com/roses.jpg">
<meta property="og:type" content="article">
```

Change the attribute name and keep the value. The same goes for the vertical prefixes, such as
`article:published_time` and `profile:username`, and for `fb:app_id`. Leave `twitter:` tags on
`name`: they are not Open Graph and are outside this rule. After the change, re-test the URL in
the preview tools the site's audience uses, such as Facebook's Sharing Debugger, which also
refreshes the cached preview.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. Each branch pins one vocabulary prefix with `^=` (`og:`, `fb:`,
`article:`, `book:`, `music:`, `video:`, `profile:`), and the `i` flag folds case. Proper
`property` tags never match, nor does a tag that carries `property` next to `name`, and neither
do unrelated names. There is no autofix: renaming the attribute is a text change, which no fix
operation makes.

## Resources

- [ogp.me: the Open Graph protocol](https://ogp.me/): every example spells `property`, from basic metadata through the verticals.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): the `og:` and `fb:` names sit as incomplete proposals, "The spec specifies this to be a value of the property attribute--not a meta keyword".
- [Facebook: sharing for webmasters](https://developers.facebook.com/docs/sharing/webmasters/): every markup example spells `property`, and pages without the tags fall back to heuristic guessing.
- [open-graph-scraper: `extract.ts`](https://github.com/jshemas/openGraphScraper/blob/master/lib/extract.ts): `const property = meta.attribs.property || meta.attribs.name`, a parser that accepts both forms.
