---
ruleId: "meta/twitter-card-names"
title: "<meta> twitter card tags"
description: "Twitter card tags that repeat Open Graph or that nothing reads; layout and attribution tags stay, since X and Discord use them."
pubDate: "2026-09-13"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name^="twitter:" i]:not([name="twitter:dnt" i]):not([name="twitter:widgets:autoload" i]):not([name="twitter:widgets:csp" i]):not([name="twitter:widgets:theme" i]), meta[property^="twitter:" i]:not([property="twitter:dnt" i]):not([property="twitter:widgets:autoload" i]):not([property="twitter:widgets:csp" i]):not([property="twitter:widgets:theme" i])'
match: "logic"
fix: { op: "remove-element" }
replacement: "Keep twitter:card, twitter:site, twitter:creator, twitter:player and the label/data pairs. Delete twitter:title, twitter:description, twitter:image and twitter:url that repeat Open Graph, and twitter:domain."
tags: ["social"]
impacts: ["seo", "maintainability"]
related: ["link/image-src", "meta/og-required-properties"]
---

Twitter card tags that repeat Open Graph are dead weight. Generators and SEO plugins emit
a `twitter:title`, `twitter:description` and `twitter:image` next to the same `og:*`
values on most of the web. A few card tags still change how a link looks, and this rule
leaves those alone.

## Why avoid

Two copies of the title, description and image drift apart. X reads the `twitter:*` copy
first and falls back to Open Graph: its last published markup reference gives the
`og:*` fallback for each tag. Discord takes the first non-empty value in document order.
When the copies match, the duplicate changes nothing on either platform. When an edit
reaches one copy and misses the other, X and Discord show different cards for the same
link.

`twitter:domain` has no documented reader. `twitter:app:*` names apps for a card type no
current source describes, so the rule reports them and leaves their removal to the author.

The tags that still do a job stay:

- **`twitter:card`** picks the layout. X's reference says that without it, "a summary card
  may be rendered": the small thumbnail. Discord's draft link-preview docs say
  `summary_large_image`, `photo` and `player` "change the layout". Apple Messages needs
  `summary` or `summary_large_image` for a preview of a social-network post. No value is
  reported.
- **`twitter:site`** and **`twitter:creator`** tie the card to an X account. Open Graph has
  no equivalent.
- **`twitter:player`** and its `twitter:player:*` details drive inline players on Discord,
  Mastodon and Apple Messages.
- **`twitter:label1`/`twitter:data1`** and the second pair show as key/value rows in Slack
  unfurls.
- **A `twitter:title`, `twitter:description` or `twitter:image` that differs from its
  `og:*` counterpart**, or has none, is an override X shows in place of Open Graph.

## Use instead

Describe the page once in Open Graph, and keep the card type:

```html
<meta property="og:title" content="A great post">
<meta property="og:description" content="Summary of the post.">
<meta property="og:image" content="https://example.com/cover.jpg">
<meta property="og:url" content="https://example.com/post">
<meta name="twitter:card" content="summary_large_image">
```

## Detectability

Fully detectable, and the rule decides in a logic module. The selector picks every
`twitter:` name, under `name` or `property`: generators use either attribute.
The module then reports three cases: a title, description, image or image detail whose
`og:*` counterpart sits beside it with the same trimmed content, a `twitter:url` beside
an `og:url`, and any `twitter:domain`, `twitter:app:*` or unknown `twitter:` name. It skips
`twitter:card`, `twitter:site`, `twitter:creator`, `twitter:player*` and the label/data
pairs.

The fix removes the element for the three inert cases: an identical duplicate, a
`twitter:url` beside `og:url`, and `twitter:domain`. Removing them leaves every card as it
was. `twitter:app:*` and unknown names are reported without a fix, since no source rules
out a reader. In a fragment, a tag at the top level has no parent to search for its
`og:*` counterpart, so the duplicate and `twitter:url` cases stay silent there.

Four names are excluded from the start: `twitter:dnt`, `twitter:widgets:autoload`,
`twitter:widgets:csp` and `twitter:widgets:theme`. They configure X's embed widgets, and
`twitter:dnt` opts visitors out of X's personalisation. Removing that one would turn
tracking back on.

## Resources

- [X Developer Platform: Cards markup (archived 2026-02-01)](https://web.archive.org/web/20260201012312/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup): the last published reference; its table "explains the OpenGraph fallback behavior for each Twitter tag", and without `twitter:card` "a summary card may be rendered".
- [discord/discord-api-docs PR #8606, "Document link previews"](https://github.com/discord/discord-api-docs/pull/8606): Discord staff's draft docs, unmerged as of 2026-09-30; `player`, `summary_large_image` and `photo` "change the layout", and "the first non-empty one wins for the title, description, and site name".
- [Apple TN3156: Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages): a social-network post preview needs "a `twitter:card` value of `summary` or `summary_large_image`".
- [mdn/fred PR #1227](https://github.com/mdn/fred/pull/1227): MDN switched to `summary` to shrink its Discord previews, a value that changes a card.
- [X Developer Platform: Webpage properties](https://docs.x.com/x-for-websites/webpage-properties): `twitter:dnt` and `twitter:widgets:*`, the names this rule excludes.
- [Matt Haughey (Slack): Everything you ever wanted to know about unfurling](https://a.wholelottanothing.org/everything-you-ever-wanted-to-know-about-unfurling-but-were-afraid-to-ask-or-how-to-make-your/): Slack's unfurler reads `twitter:label1` and `twitter:data1`.
- [The Open Graph protocol](https://ogp.me/): the `og:*` properties the duplicates repeat.
