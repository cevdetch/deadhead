---
description: "What search engines read in the HTML head, canonicals, hreflang, robots and descriptions, the mistakes that void them, and the tags they ignore."
---

Search engines read a small part of the head closely. The `<title>` and
`<meta name="description">` feed the result snippet. `<link rel="canonical">` says which URL
represents a page reachable at several. `<link rel="alternate" hreflang>` maps language
versions to each other, and `<meta name="robots">` asks for a page to stay out of the index
or out of snippets. Google documents what it reads in its
[guide to supported meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags).

These signals fail without an error. A page with two canonicals has Google ignore both. A
relative canonical resolves against whichever host was crawled, so a staging copy names
itself. A canonical or hreflang link after something that closes the head is ignored. A
robots directive in `http-equiv`, or misspelt, does nothing, so a `noindex` meant to keep a
page out of the index leaves it in. And much of what templates still carry is read by no
engine at all: `keywords`, `revisit-after`, `distribution`, a `title` meta, a sitemap link,
verification tags for services that closed.

Deadhead reports twenty-seven:

- Canonicals: [`head/canonical-multiple`](/rules/head/canonical-multiple),
  [`link/canonical-relative`](/rules/link/canonical-relative),
  [`link/canonical-http`](/rules/link/canonical-http),
  [`link/canonical-qualifiers`](/rules/link/canonical-qualifiers) and
  [`head/metadata-position`](/rules/head/metadata-position).
- Languages: [`link/hreflang-relative`](/rules/link/hreflang-relative),
  [`link/hreflang-value`](/rules/link/hreflang-value) and
  [`meta/google-value`](/rules/meta/google-value).
- Indexing directives: [`meta/robots-value`](/rules/meta/robots-value),
  [`meta/http-equiv-robots`](/rules/meta/http-equiv-robots) and
  [`meta/tdm-reservation-value`](/rules/meta/tdm-reservation-value), the text and data
  mining opt-out.
- Snippets: [`head/description-multiple`](/rules/head/description-multiple) and
  [`meta/http-equiv-description`](/rules/meta/http-equiv-description).
- Structured data with no rich result:
  [`script/json-ld-search-action`](/rules/script/json-ld-search-action) and
  [`script/json-ld-howto-faq-announcement`](/rules/script/json-ld-howto-faq-announcement).
- Tags nothing reads: [`meta/keywords`](/rules/meta/keywords),
  [`meta/news-keywords`](/rules/meta/news-keywords), [`meta/title`](/rules/meta/title),
  [`meta/abstract`](/rules/meta/abstract), [`meta/revisit-after`](/rules/meta/revisit-after),
  [`meta/coverage`](/rules/meta/coverage), [`meta/distribution`](/rules/meta/distribution),
  [`meta/page-info-names`](/rules/meta/page-info-names),
  [`meta/fragment`](/rules/meta/fragment),
  [`meta/verification-names`](/rules/meta/verification-names),
  [`link/sitemap`](/rules/link/sitemap) and
  [`link/anchor-keywords`](/rules/link/anchor-keywords).

The [SEO impact](/impacts/seo) page lists every rule that changes what search engines index
or show, including the title and Open Graph rules.
