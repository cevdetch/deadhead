---
ruleId: "meta/coverage"
title: "<meta name=\"coverage\">"
description: "A geographic-scope hint (Worldwide, Global) that no search crawler reads; reach comes from targeting tools, not markup."
pubDate: "2026-09-19"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="coverage" i]'
fix: { op: "remove-element" }
replacement: "Delete the element. Reach comes from Search Console targeting and hreflang, not from markup."
tags: ["search"]
impacts: ["seo", "maintainability"]
related: ["meta/distribution", "meta/revisit-after"]
---

`<meta name="coverage">` marks a page `Worldwide` or `Global` for crawlers. No crawler reads the
mark: Google leaves the name off its supported list and the extension registry holds no row for
the bare name.

The term comes from Dublin Core, which defines `coverage` as "the spatial or temporal topic of
the resource, spatial applicability of the resource, or jurisdiction under which the resource is
relevant": the region a map shows, or the period a history covers. Written as a bare meta name
with a value like `Worldwide`, it reads as a reach hint for search engines, and no search engine
takes it up.

## Why avoid

Google names the tags its crawler supports and leaves `coverage` off the list, and says it "will
ignore meta tags that it doesn't support". Its guide to multi-regional sites lists the signals
it does use for a page's audience: country-code domains, hreflang, server location, and on-page
signals such as local addresses and currency. It adds that "Google ignores locational meta
tags".

The WHATWG wiki MetaExtensions table holds rows for qualified Dublin Core names with no row for
bare `coverage`. A case-insensitive search of the table finds nothing, so the name sits outside
the registry. `dcterms.coverage` holds a Proposal row with a schema link condition, so the gap
concerns the bare name alone.

DCMI's own comment adds that "it is preferable to use the more specific subproperties Temporal
Coverage and Spatial Coverage", and its definition describes what the resource is about or where
it applies. A `Worldwide` stamped on every page says nothing that sets one page apart, so the
tag serves neither the catalogue reading nor the search one.

The hint duplicates channels crawlers check. A hint they skip sits beside settings they read
elsewhere, and the two drift apart with no warning.

## Use instead

Delete the element. For regional audiences, use hreflang and locale-specific URLs:

```html
<!-- Before -->
<meta name="coverage" content="Worldwide">

<!-- After: only where regional versions exist -->
<link rel="alternate" hreflang="en-GB" href="https://example.com/uk/guide">
<link rel="alternate" hreflang="en-US" href="https://example.com/us/guide">
<link rel="alternate" hreflang="x-default" href="https://example.com/guide">
```

A page meant for everyone needs nothing: worldwide is the default. Search Console's country
targeting setting no longer exists; Google deprecated the International Targeting report in 2022
and kept hreflang. A catalogue that needs Dublin Core coverage data can publish
`DCTERMS.spatial` or `DCTERMS.temporal` with its `schema.DCTERMS` link, as
`meta/dublin-core-without-schema` describes.

## Detectability

Detectable with one selector. The CLI, the bookmarklet and the ESLint plugin report the same
findings, and none skips. The rule matches `meta` elements whose `name` is `coverage`, with the
`i` flag for case variants. `=` fits because `name` holds a single value, not a token set, so a
prefixed `DC.coverage` stays quiet. The fix removes the element: no crawler reads it.

## Resources

- [Google Search Central: Meta tags and attributes that Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags): Google lists supported `meta` tags with no `coverage` and states it ignores tags outside the list.
- [Google Search Central: managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites): the signals Google uses for a page's audience, and "Google ignores locational meta tags".
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): the extension registry with no row for bare `coverage`; `dcterms.coverage` holds a Proposal row with a schema link condition.
- [DCMI: DCMI Metadata Terms, coverage](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/#coverage): the definition, and and the comment preferring "the more specific subproperties Temporal Coverage and Spatial Coverage".
- [Search Console Help: the International Targeting report is deprecated](https://support.google.com/webmasters/answer/12474899): country targeting "is no longer supported"; hreflang remains.
