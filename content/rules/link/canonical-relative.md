---
ruleId: "link/canonical-relative"
title: "<link rel=\"canonical\"> with relative href"
description: "A relative canonical resolves against the crawled host, so staging copies point at themselves."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="canonical" i][href]'
match: "logic"
fix: { op: "none" }
replacement: "Resolve the href against the site's canonical host and emit an absolute https URL: <link rel=\"canonical\" href=\"https://example.com/post\">."
tags: ["search"]
impacts: ["seo"]
related: ["head/canonical-multiple", "link/canonical-http"]
---

A `link rel=canonical` with a relative `href` resolves against the host that serves the page. On
a staging copy left open to crawlers, that host is the staging copy.

The same resolution applies to every other host the page answers on: the `www` and bare domain
when both serve content, an `http://` copy without a redirect, a CDN or preview hostname, a
proxy that republishes the site. A relative canonical follows the page to each of them and names
each copy as its own preferred address, which is the opposite of what a canonical is for.

## Why avoid

Google: "Use absolute paths rather than relative paths with the rel="canonical" link element.
Even though relative paths are supported by Google, they can cause problems in the long run (for
example, if you unintentionally allow your testing site to be crawled) and thus we don't
recommend them." A relative target resolves against the crawled host, so a staging copy left
open to crawlers points at itself as canonical.

The indexed staging copy then competes with the live page. Ranking signals split across the two
addresses instead of consolidating on one, and search results can show the staging address. The
same split happens between `www` and the bare domain, or between `http://` and `https://`,
whenever both answer: each variant declares itself canonical, and the tag that was meant to
settle the question adds one more vote for each side.

A `<base href>` changes the target too. The relative URL resolves against the document base URL,
so a base element written for asset paths can move the canonical somewhere else.

RFC 6596 permits a relative target and prints a relative example beside the absolute one. The
markup is legal; the indexing outcome is the harm.

## Use instead

Emit an absolute https canonical built from the configured site host:

```html
<!-- Before: resolves against whichever host served the page -->
<link rel="canonical" href="/posts/my-post">

<!-- After -->
<link rel="canonical" href="https://example.com/posts/my-post">
```

The host comes from site configuration, never from the request: a canonical built from the
request preserves whatever host the crawler asked for, staging included. Static site generators
have a setting for it: Astro, for one, uses its `site` option "to generate your sitemap and
canonical URLs". Back the canonical with a redirect from the other hostnames to the canonical
one, and keep staging out of the index with authentication or a `noindex`, so the canonical is
not the only thing standing between the copy and the results.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings, and none skips. `rel` matches with `~=` because it is a
space-separated token set. The module trims the `href` as the URL parser does, so
`href=" https://example.com/"` is absolute, and reports anything that does not start with
`http://` or `https://`: a path, a protocol-relative `//example.com/post`, and an empty
`href=""`, which resolves to the page's own URL. A tag with no `href` belongs to
`link/href-missing`, and an absolute `http://` target to `link/canonical-http`. There is no
autofix: the absolute URL needs the site's origin.

## Resources

- [Google Search Central: consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): "Use absolute paths rather than relative paths with the rel="canonical" link element", with a crawled testing site as the example of the long-run harm.
- [RFC 6596: the canonical link relation](https://www.rfc-editor.org/rfc/rfc6596.txt): permits a relative target IRI and prints a relative example beside the absolute one.
- [Bing Webmaster Blog: partnering to help solve duplicate content issues](https://blogs.bing.com/webmaster/February-2009/Partnering-to-help-solve-duplicate-content-issues): documents relative or absolute URLs in `href` and treats the tag as a hint evaluated with other signals.
- [HTML Standard: document base URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#document-base-url): relative URLs in the document resolve against the base URL a `<base href>` sets.
- [Astro: configuration reference, `site`](https://docs.astro.build/en/reference/configuration-reference/#site): the "final, deployed URL" Astro uses "to generate your sitemap and canonical URLs".
