---
description: "Head markup that changes what search engines index or show: canonicals, hreflang, robots directives, titles, structured data and previews."
---

Search engines read a few head elements closely and ignore most of the rest. The rules here
cover both halves: signals that fail without an error, and tags that do nothing for search
however many templates still write them.

The signals that fail are the harmful ones. Two canonicals on a page, a relative one, an
`http://` one, or one after something that closes the head, and Google ignores it or follows
the wrong URL. A relative hreflang URL, or a code outside ISO 639-1 and ISO 3166-1, drops a
language version from the set. A robots directive in `http-equiv`, or with a token no crawler
documents, leaves a page indexed that was meant to stay out. JSON-LD that does not parse is
discarded whole. A missing or duplicate title leaves the result without the heading the
author wrote, and a relative `og:image` leaves a shared link without its picture. None of
these is autofixed, because the repair is a URL, a code or a value only the author knows.

The tags that do nothing are unnecessary findings: `keywords`, `news_keywords`,
`revisit-after`, `distribution`, `abstract`, a `title` meta, a sitemap link in the HTML,
verification tags for services that closed, the data-vocabulary.org vocabulary,
`SearchAction` and HowTo or FAQ markup for displays Google no longer draws, and Twitter card
tags that repeat Open Graph. More than half have an autofix. They are reported because they suggest
the page's search setup lives in tags no engine reads.

Google's [guide to supported meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags)
and its [canonical documentation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
are the primary references. The [search](/topics/search), [social previews](/topics/social)
and [structured data](/topics/structured-data) topics group the same rules by feature.
