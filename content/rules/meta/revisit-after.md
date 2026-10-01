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

## Why avoid

Google names the tag and states that crawlers ignore it.

The WHATWG wiki row for the name reports one supporting engine in history, one that never found broad use, and sums the tag up as "nothing more than a good luck charm".

The name sits outside the HTML Standard, which never mentions it, and outside the names MDN documents.

Change timing belongs in the sitemap. Google and Bing read `lastmod` when it matches the page's real changes, and both ignore `changefreq`, which stays a hint for other crawlers. A tag no crawler reads duplicates that channel, and the two drift apart with no warning.

## Use instead

Delete the element. State change timing in the sitemap:

```xml
<url>
  <loc>https://example.com/guide</loc>
  <lastmod>2026-09-18</lastmod>
  <changefreq>weekly</changefreq>
</url>
```

Of the two fields, Google and Bing read `lastmod`, so it has to change when the content does.

## Detectability

Detectable with one selector: `name` holds a single value, so `=` with the `i` flag matches it.

## Resources

- [Google: meta tags and web search (2007)](https://developers.google.com/search/blog/2007/12/answering-more-popular-picks-meta-tags): Google names `revisit-after` as ignored by crawlers.
- [Google: Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): "Google ignores `<priority>` and `<changefreq>` values"; it uses an accurate `<lastmod>`.
- [Bing: Sitemaps in AI Powered Search (2025)](https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/): "changefreq and priority are ignored by Bing"; `lastmod` drives recrawl.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): one supporting engine in history; a "good luck charm".
- [HTML Standard: semantics](https://html.spec.whatwg.org/multipage/semantics.html#other-metadata-names): never mentions the name.
- [MDN: meta name](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name): no `revisit-after` among the names.
