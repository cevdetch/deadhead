---
ruleId: "meta/distribution"
title: "<meta name=\"distribution\">"
description: "A distribution-scope hint (global, local, IU) that no search crawler reads; scope comes from targeting tools, not markup."
pubDate: "2026-09-19"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="distribution" i]'
fix: { op: "remove-element" }
replacement: "Delete the element. Reach comes from Search Console targeting and hreflang, not from markup."
tags: ["search"]
impacts: ["seo", "maintainability"]
related: ["meta/keywords", "meta/revisit-after"]
---

`<meta name="distribution">` marks a page `global`, `local`, or `IU` for crawlers. No crawler
reads the mark: Google names it among the locational tags it ignores, and the extension registry
holds no row for it.

## Why avoid

Google is explicit about this one. Its guide to multi-regional sites lists what it uses to work
out a page's audience (country-code domains, hreflang, server location and on-page signals such
as local addresses and currency) and states: "Google ignores locational meta tags (like
`geo.position` or `distribution`) or geotargeting HTML attributes." Its list of supported meta
tags leaves the name off, and it says it "will ignore meta tags that it doesn't support".

The WHATWG wiki MetaExtensions table holds rows for standard crawler names with no row for
`distribution`. A case-insensitive search of the table finds nothing, so the name sits outside
the registry. MDN lists standard names plus common extension names for `meta` with no
`distribution`. The name appears in no standard and in no documented extension set.

The hint also invites a false belief: that `local` keeps a page out of results abroad, or that
`global` extends its reach. Neither happens, and the real levers go unused while the tag sits in
the head.

## Use instead

Delete the element. Signal regional audiences with the mechanisms search engines read:

```html
<!-- Before -->
<meta name="distribution" content="local">

<!-- After: language and regional versions, each listing all the others -->
<link rel="alternate" hreflang="de-CH" href="https://example.com/ch/guide">
<link rel="alternate" hreflang="de-DE" href="https://example.com/de/guide">
<link rel="alternate" hreflang="x-default" href="https://example.com/guide">
```

Google's guide adds locale-specific URLs, such as a country-code domain or a subdirectory per
country, and content that serves the region: its language, currency, addresses and phone
numbers. Search Console's country targeting setting no longer exists; Google deprecated the
International Targeting report in 2022.

## Detectability

Detectable with one selector. The CLI, the bookmarklet and the ESLint plugin report the same
findings, and none skips. The rule matches `meta` elements whose `name` is `distribution`, with
the `i` flag for case variants. `=` fits because `name` holds a single value, not a token set.
The fix removes the element: no crawler reads it, so nothing changes for any of them.

## Resources

- [Google Search Central: managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites): the signals Google uses for a page's audience, and "Google ignores locational meta tags (like geo.position or distribution)".
- [Google Search Central: Meta tags and attributes that Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags): Google lists supported `meta` tags with no `distribution` and states it ignores tags outside the list.
- [Search Console Help: the International Targeting report is deprecated](https://support.google.com/webmasters/answer/12474899): country targeting "is no longer supported"; hreflang remains.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): the extension registry with no row for `distribution`.
- [MDN: meta name](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name): standard names plus common extension names with no `distribution`.
