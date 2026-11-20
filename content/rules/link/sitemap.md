---
ruleId: "link/sitemap"
title: "<link rel=\"sitemap\">"
description: "Search engines find sitemaps through robots.txt and their webmaster tools; none documents reading a link to one from HTML."
pubDate: "2026-09-13"
updatedDate: "2026-09-23"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="sitemap" i]'
fix: { op: "remove-tokens", attr: "rel" }
replacement: "Delete it and declare the sitemap once, in /robots.txt at the server root: Sitemap: https://example.com/sitemap-index.xml"
tags: ["search"]
impacts: ["seo", "maintainability"]
related: ["link/image-src", "meta/keywords"]
---

No search engine reads `<link rel="sitemap">`. `<link rel="sitemap" type="application/xml" href="/sitemap.xml">`
points from a page to
the site's XML sitemap. It looks like the obvious place to announce one, which is why
framework guides and SEO plugins keep adding it to every page's `<head>`. It is not where
search engines look.

## Why avoid

Discovery is defined elsewhere, and HTML isn't part of it. The sitemaps.org protocol, the
format Google, Bing and the rest share, lists three ways to tell a crawler where a sitemap
is: the search engine's own submission interface, a `Sitemap:` line in robots.txt, and an
HTTP ping. Google's documentation lists Search Console, the Search Console API and
robots.txt. Google retired the ping endpoint in 2023. Bing removed anonymous ping
submission in 2022, and points to a robots.txt reference "at the root of the host", Bing
Webmaster Tools and IndexNow. None of them documents a `<link>` element as a way in.

Nor is it a link type a browser knows. The rel registry the HTML Standard defers to lists
`sitemap` as `proposed` and nothing more, so a browser tokenises the keyword and does
nothing with it.

The cost is duplication that can quietly disagree. The link repeats a URL that robots.txt
already declares, on every page rather than once per host. When the sitemap moves, from
`/sitemap.xml` to a split `/sitemap-index.xml` say, the robots.txt line is the one that
gets updated because it is the one that works. The `<link>` goes on advertising the old
path in markup that looks authoritative and isn't.

## Use instead

One line in robots.txt at the root of the host:

```txt
Sitemap: https://example.com/sitemap-index.xml
```

The URL must be absolute. If you use Google Search Console or Bing Webmaster Tools, submit
the same URL there too, and use IndexNow if you want changed URLs picked up quickly.

## Detectability

Fully detectable. The rule matches with `~=` because `rel` is a space-separated token set,
the same reasoning as `link/image-src`.

The fix removes the element. No documented consumer discovers sitemaps from HTML, so
removing the link leaves crawling where it was, as long as robots.txt carries the
`Sitemap:` line. That is worth checking once before running the fix across a site. The
rule can't see robots.txt, so it can't check that for you.

## Resources

- [sitemaps.org: Sitemaps XML format: informing search engine crawlers](https://www.sitemaps.org/protocol.html#informing): the protocol's discovery methods: submission interface, robots.txt `Sitemap:` directive, ping.
- [Google Search Central: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): Search Console, the Search Console API and robots.txt; no HTML link.
- [Google Search Central Blog: Sitemaps ping endpoint is going away (June 2023)](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping): the ping retired; robots.txt and Search Console remain.
- [Bing Webmaster Blog: Removed Bing anonymous sitemap submission (May 2022)](https://blogs.bing.com/webmaster/may-2022/Spring-cleaning-Removed-Bing-anonymous-sitemap-submission): robots.txt at the host root, Bing Webmaster Tools and IndexNow.
- [microformats: existing rel values](https://microformats.org/wiki/existing-rel-values): `sitemap` listed as `proposed` among HTML5 link type extensions.
