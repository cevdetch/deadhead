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

A `meta` tag carrying an Open Graph vocabulary in `name` feeds no preview parser. The protocol reads `property`; the keyword registry marks the `name` form incomplete.

## Why avoid

ogp.me builds the protocol on RDFa `property` tags. Every example on the page, from basic metadata to verticals, spells `property`, never `name`.

The WHATWG keyword registry lists the `og:` and `fb:` names as incomplete proposals, with the note that the spec wants a `property` value, not a meta keyword.

Preview parsers read `property`. A `name`-form tag is not a registered keyword either, so it feeds nobody: the card falls back to scraped headings and images.

The failure is silent. No parser errors, no console warning; the author sees a card and assumes the tags work.

## Use instead

The `property` form, matching the protocol:

```html
<meta property="og:title" content="The title">
<meta property="og:type" content="article">
```

## Detectability

Detectable with the selector alone. Each branch pins one vocabulary prefix with `^=`, and the `i` flag folds case. Proper `property` tags never match, nor does a tag that carries `property` next to `name`, and neither do unrelated names.

## Resources

- [ogp.me: the Open Graph protocol](https://ogp.me/): every example spells `property`, from basic metadata through the verticals.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): the `og:` and `fb:` names sit as incomplete proposals wanting a `property` value, not a meta keyword.
- [Facebook: sharing for webmasters](https://developers.facebook.com/docs/sharing/webmasters/): every markup example spells `property`, and pages without the tags fall back to heuristic guessing.
