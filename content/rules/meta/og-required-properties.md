---
ruleId: "meta/og-required-properties"
title: "Open Graph tags on a page with no og:image"
description: "A page with Open Graph tags and no og:image shares a card without a picture; title, URL and description fall back."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Add <meta property=\"og:image\" content=\"https://example.com/cover.jpg\"> with an absolute URL. <title>, rel=canonical and the meta description cover the rest."
tags: ["social"]
impacts: ["seo"]
related: ["meta/og-name-attribute", "meta/og-relative-url", "meta/twitter-card-names"]
---

A page with Open Graph tags and no `og:image` shares as a card without a picture. Of the four
properties ogp.me calls required, the image is the one no other tag on the page stands in for.
A page with no Open Graph tags is not this rule's business.

## Why avoid

A link preview takes its picture from `og:image`. Mastodon's extractor reads the image from that
tag and from no other. Meta's crawler guesses one with internal heuristics when the tag is
missing, and Meta warns the guess can miss the picture the author meant. Elsewhere the card
is text, the same card a page with no Open Graph gets.

The rest of the set has fallbacks. Meta and ogp.me both treat a page without `og:type` as
`website`. Mastodon takes the title from `<title>`, the description from
`<meta name="description">` and the URL from `<link rel="canonical">`, which it reads before
`og:url`. A page carrying those three needs `og:image` alone for a link preview.

Write `og:image` and not its structured twin `og:image:url`. ogp.me defines the two as
identical, `og:image` is the shorter tag, and Mastodon reads `og:image` and nothing else. The
rule counts `og:image` alone; `og:image:secure_url` is an alternate address for the same
image, not a replacement for it.

The gap costs the card its picture and breaks nothing else, which is why the rule rates it at
the lowest severity.

## Use instead

Give the page its own title, description and canonical URL, and add the image:

```html
<title>How to deadhead roses</title>
<meta name="description" content="Pinch off spent blooms above the first five-leaflet leaf.">
<link rel="canonical" href="https://example.com/posts/deadhead-roses">
<meta property="og:image" content="https://example.com/cover.jpg">
```

Add `og:title`, `og:description` or `og:url` where they say something the page's own tags do
not. Meta asks for an `og:title` without the site name that `<title>` carries, and counts likes
and shares against `og:url`. The rule leaves those choices to the author.

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector can
say "an `og:` tag but not this one". The logic in
`packages/rules/logic/meta/og-required-properties.ts` collects every `property` value and reports
on `head` when one starts with `og:` and none is `og:image`. A page with no `og:` tags stays
quiet. `name`-form lookalikes count for nothing here; `meta/og-name-attribute` reports them. The
check reads attributes, never source offsets, so it reports in all three adapters.

The rule checks that the tag exists. A relative `content` is a different defect, which
`meta/og-relative-url` reports.

A fragment, a file with no doctype and no `<html>` tag, is not checked: the image can sit in
another partial of the same page.

## Resources

- [ogp.me: the Open Graph protocol](https://ogp.me/): four required properties, "Any non-marked up webpage should be treated as og:type website", and `og:image:url` defined as "Identical to og:image".
- [Meta: A Guide to Sharing for Webmasters](https://developers.facebook.com/docs/sharing/webmasters/): `og:type` defaults to `website`, `og:title` without branding, `og:url` aggregating likes and shares, and heuristic guessing when `og:image` is missing.
- [Mastodon: link_details_extractor.rb](https://github.com/mastodon/mastodon/blob/main/app/lib/link_details_extractor.rb): the title falls back to `<title>`, the description to the meta description, the URL reads `rel=canonical` first, and the image reads `og:image` with no fallback.
