---
ruleId: "meta/abstract"
title: "<meta name=\"abstract\">"
description: "A page-summary hint that no search crawler reads; description carries the summary, not this duplicate."
pubDate: "2026-09-19"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="abstract" i]'
fix: { op: "remove-element" }
replacement: "Delete the element. The summary belongs in meta name=description, not in this duplicate."
tags: ["search"]
impacts: ["seo", "maintainability"]
related: ["meta/coverage", "meta/distribution"]
---

`<meta name="abstract">` carries a page summary for crawlers. No crawler reads it: Google leaves
the name off its supported list and the extension registry holds no row for the bare name.

The name borrows a Dublin Core term. DCMI defines `abstract` as "A summary of the resource", a
refinement of `description`, for catalogues of documents and datasets. Written as a bare meta
name, beside or in place of `description`, it reads as a second summary for search engines, and
none of them uses it.

## Why avoid

Google names the tags its crawler supports and leaves `abstract` off the list. It says it "will
ignore meta tags that it doesn't support", so the element adds bytes crawlers skip. Google's
snippet documentation names one tag as a source: it "sometimes uses the meta description HTML
element" for the snippet.

The WHATWG wiki MetaExtensions table holds rows for qualified Dublin Core names with no row for
bare `abstract`. A case-insensitive search of the table finds nothing, so the name sits outside
the registry. `dcterms.abstract` holds a Proposal row with a schema link condition and names
`description` as synonym, so the gap concerns the bare name alone.

DCMI's definition belongs to catalogue metadata for libraries and archives. Even there, the
DC-HTML conventions expect a prefixed name such as `DCTERMS.abstract`, bound by a
`schema.DCTERMS` link; a bare `abstract` is no Dublin Core name in HTML at all.

The hint duplicates a tag crawlers read. The two summaries drift apart: an edit to the
description leaves the abstract stale, and a reader of the head cannot tell which one is
current.

## Use instead

Delete the element, and fold anything worth keeping into the description:

```html
<!-- Before: two summaries, one read -->
<meta name="description" content="Field guide to head metadata.">
<meta name="abstract" content="A summary of this guide for crawlers.">

<!-- After -->
<meta name="description" content="Field guide to head metadata and the tags crawlers read.">
```

A page that publishes Dublin Core for a catalogue can keep a qualified `DCTERMS.abstract` with
its `<link rel="schema.DCTERMS" href="http://purl.org/dc/terms/">` declaration, which is the
form the registry and DCMI describe. Search engines ignore that one too, so it adds nothing for
search.

## Detectability

Detectable with one selector. The CLI, the bookmarklet and the ESLint plugin report the same
findings, and none skips. The rule matches `meta` elements whose `name` is `abstract`, with the
`i` flag for case variants. `=` fits because `name` holds a single value, not a token set, so
`DCTERMS.abstract` stays quiet. The fix removes the element: no crawler reads it.

## Resources

- [Google Search Central: Meta tags and attributes that Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags): Google lists supported `meta` tags with no `abstract` and states it ignores tags outside the list.
- [Google Search Central: Control your snippets](https://developers.google.com/search/docs/appearance/snippet): Google "sometimes uses the meta description HTML element" for the snippet.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): the extension registry with no row for bare `abstract`; `dcterms.abstract` holds a Proposal row with a schema link condition and names `description` as synonym.
- [DCMI: DCMI Metadata Terms, abstract](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/abstract/): "A summary of the resource", a subproperty of description.
- [DCMI: expressing Dublin Core in HTML meta/link](https://www.dublincore.org/specifications/dublin-core/dc-html/): prefixed names such as `DCTERMS.abstract`, bound by a `schema.DCTERMS` link.
