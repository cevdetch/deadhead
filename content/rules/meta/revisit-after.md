---
ruleId: "meta/revisit-after"
title: "<meta name=\"revisit-after\">"
description: "A crawl-schedule hint that search engines ignore; recrawl timing comes from sitemaps, not markup."
pubDate: "2026-09-19"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="revisit-after" i]'
fix: { op: "remove-element" }
replacement: "Delete it. In the sitemap, keep lastmod accurate for Google and Bing, and add changefreq for other crawlers."
tags: ["search"]
impacts: ["seo", "maintainability"]
related: ["meta/keywords"]
---

`<meta name="revisit-after">` tells crawlers when to come back. No crawler listens.

The tag belongs to the early web's crawler folklore, written as `content="7 days"` or
`content="30 days"` and copied from template to template. It was never part of HTML, and the
crawlers that matter schedule their visits from their own signals.

## Why avoid

Google's 2007 post on meta tags annotates `<meta name="revisit-after" content="14 days">` as
"Not utilized by Google or other major search engines", and says webmasters "needlessly include
`revisit-after` to encourage a search engine's crawl schedule, however this `meta` tag is
largely ignored." The WHATWG wiki row for the name reports one supporting engine in history, one
"never widely used", and sums the tag up as "nothing more than a good luck charm". The name sits
outside the HTML Standard, which never mentions it, and outside the names MDN documents.

The cost is small and steady. The tag ships in every response, and it leaves the impression that
recrawl timing is handled when it is not. A site that wants a page fetched again after a change
has to say so through a channel crawlers read.

Change timing belongs in the sitemap. Google and Bing read `lastmod` when it matches the page's
real changes, and both ignore `changefreq`, which stays a hint for other crawlers. A tag no
crawler reads duplicates that channel, and the two drift apart with no warning.

## Use instead

Delete the element. State change timing in the sitemap:

```xml
<url>
  <loc>https://example.com/guide</loc>
  <lastmod>2026-09-18</lastmod>
  <changefreq>weekly</changefreq>
</url>
```

Google: "Google uses the `<lastmod>` value if it's consistently and verifiably (for example by
comparing to the last modification of the page) accurate." Set it from the date the content
changed, not the date the sitemap was generated: a `lastmod` that moves on every build is
neither consistent nor verifiable. `changefreq` can stay for crawlers other than Google's and
Bing's, which treat it as a hint.

Two other channels carry the signal. Conditional requests let a crawler check a page at little
cost: Google's crawlers support `ETag` with `If-None-Match` and `Last-Modified` with
`If-Modified-Since`, prefer `ETag` when both are present, and Google suggests setting both. A
server that answers an unchanged page with `304 Not Modified` saves the transfer. IndexNow
pushes the change instead of waiting for a crawl: the site sends the changed URL to a
participating search engine, and those engines share the submission among themselves. Bing,
Yandex, Seznam, Naver and Yep take part; Google does not.

## Detectability

Detectable with one selector: `name` holds a single value, so `=` with the `i` flag matches it.
The CLI, the bookmarklet and the ESLint plugin report the same findings, and none skips. The
autofix removes the element: no crawler reads it, so nothing changes for any of them.

## Resources

- [Google: meta tags and web search (2007)](https://developers.google.com/search/blog/2007/12/answering-more-popular-picks-meta-tags): `revisit-after` is "Not utilized by Google or other major search engines" and "largely ignored".
- [Google: Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): "Google ignores `<priority>` and `<changefreq>` values"; it uses an accurate `<lastmod>`.
- [Bing: Sitemaps in AI Powered Search (2025)](https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/): "changefreq and priority are ignored by Bing"; `lastmod` drives recrawl.
- [Google crawling infrastructure: HTTP caching](https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers): support for `ETag`/`If-None-Match` and `Last-Modified`/`If-Modified-Since`, with `ETag` preferred.
- [IndexNow: documentation](https://www.indexnow.org/documentation): the submission request and the sharing of submitted URLs among participating engines; the [participating engines](https://www.indexnow.org/searchengines) list no Google.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): one supporting engine in history; a "good luck charm".
- [HTML Standard: semantics](https://html.spec.whatwg.org/multipage/semantics.html#other-metadata-names): never mentions the name.
- [MDN: meta name](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name): no `revisit-after` among the names.
