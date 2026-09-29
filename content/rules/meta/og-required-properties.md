---
ruleId: "meta/og-required-properties"
title: "<meta property> missing required properties"
description: "A page starting Open Graph markup without all four required properties ships broken cards."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Complete the set with true page values: <meta property=\"og:title\" content=\"The title\">, <meta property=\"og:type\" content=\"article\">, <meta property=\"og:url\" content=\"https://example.com/post\">, <meta property=\"og:image\" content=\"https://example.com/cover.jpg\">."
tags: ["social"]
impacts: ["seo"]
related: ["meta/og-name-attribute"]
---

A page carrying Open Graph tags without all four required properties ships a broken card. The set is title, type, url and image; a page with none of them is not this rule's business.

## Why avoid

ogp.me names four required properties for every page. A page starting the set without finishing it promises a card it cannot render.

A missing image means no image, a missing title means a scraped headline, and a missing url scatters likes and shares across duplicate addresses instead of aggregating them.

Facebook asks the same four of every content type. A half-tagged page lands between explicit markup and heuristic guessing, with the tags suppressing guesses but missing the pieces.

The shape traps incremental adoption. The author adds two tags, sees a card of some kind, and never learns the remaining two were load-bearing.

## Use instead

Emit the full required set with true values:

```html
<meta property="og:title" content="How to deadhead roses">
<meta property="og:type" content="article">
<meta property="og:url" content="https://example.com/posts/my-post">
<meta property="og:image" content="https://example.com/cover.jpg">
```

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector can say "some but not all". The logic in `packages/rules/logic/meta/og-required-properties.ts` censuses `property` tags starting with `og:`; zero such tags stays quiet, and any missing required name lands in the finding detail on `head`. The check reads attributes, never source offsets, so it reports in all three adapters.

A fragment, a file with no doctype and no `<html>` tag, is not checked: the other required properties can sit in another partial of the same page.

## Resources

- [ogp.me: the Open Graph protocol](https://ogp.me/): four required properties for every page, with the permanent-ID role of `og:url`.
- [Facebook: sharing for webmasters](https://developers.facebook.com/docs/sharing/webmasters/): the basic-tags table for every content type, plus heuristic guessing for untagged pages.
