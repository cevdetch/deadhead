---
ruleId: "meta/og-relative-url"
title: "<meta property> relative Open Graph URLs"
description: "Relative preview URLs point nowhere for crawlers; write absolute http(s) URLs."
pubDate: "2026-09-14"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[property="og:url" i]:not([content^="http://" i]):not([content^="https://" i]), meta[property="og:image" i]:not([content^="http://" i]):not([content^="https://" i]), meta[property="og:video" i]:not([content^="http://" i]):not([content^="https://" i]), meta[property="og:audio" i]:not([content^="http://" i]):not([content^="https://" i])'
match: "logic"
fix: { op: "none" }
replacement: "Write the full URL: <meta property=\"og:image\" content=\"https://example.com/cover.jpg\">, not /cover.jpg or //cdn.example.com/cover.jpg."
tags: ["social"]
impacts: ["seo"]
related: ["head/canonical-multiple", "meta/twitter-card-names"]
---

A relative `og:image` points nowhere. `<meta property="og:image" content="/images/cover.jpg">`
resolves inside the site, and Open Graph values are read elsewhere: by a scraper that fetched
the HTML to build a link preview, and to that scraper `/images/cover.jpg` points nowhere.

## Why avoid

The protocol defines these values as absolute URLs. The Open Graph protocol's type table says
a URL is "All valid URLs that utilize the http:// or https:// protocols". Its machine-readable
schema gives the type as "a string of Unicode characters forming a valid URL having the http
or https scheme", and assigns it to `og:url`, `og:image`, `og:video` and `og:audio`. A path like
`/cover.jpg`, a bare `cover.jpg`, or a scheme-less `//cdn.example.com/cover.jpg` is not a value
of that type.

`og:url` is the object's identity: Open Graph defines it as "the canonical URL
of your object that will be used as its permanent ID in the graph", and Facebook's webmaster
guide calls it "the canonical URL for your page". A relative ID means nothing outside the
document it was written in, so shares of the same page stop being recognised as one object.

A consumer that follows the protocol has nothing to resolve a relative value against, so it
treats it as invalid or absent. The share card appears without its image or video, or with
one the scraper guessed. It fails silently: the page looks fine in every browser, and the broken
card shows up when someone shares the link. Meta states the rule: "All URLs must be absolute
as they represent the canonical location of a resource (page/image), so that we can attribute
shares and likes to the correct URL and cache images properly." Its Sharing Debugger flags
relative `og:url` and `og:image` values.

## Use instead

```html
<meta property="og:url" content="https://example.com/posts/my-post">
<meta property="og:image" content="https://example.com/images/cover.jpg">
```

Build them from the site's origin when the page is rendered. In JavaScript, use
`new URL(path, "https://example.com")`.

## Detectability

Fully detectable. The rule picks out the four URL-typed base properties whose `content`
doesn't already begin with `http://` or `https://`. The logic then trims surrounding whitespace
and reports any value that still doesn't. A missing `content` is reported too. Structured variants such as
`og:image:secure_url` share the type but aren't covered, and neither is the common
`name="og:image"` mistake.

There is no autofix: making a value absolute needs the site's origin, which the markup
doesn't carry.

## Resources

- [The Open Graph protocol: Types](https://ogp.me/#types): URL: "All valid URLs that utilize the http:// or https:// protocols"; `og:url` as the object's permanent ID.
- [Open Graph schema: ogp.me.ttl](https://ogp.me/ns/ogp.me.ttl): `ogc:url`, "a valid URL having the http or https scheme", as the range of `og:url`, `og:image`, `og:video` and `og:audio`.
- [Meta for Developers: A Guide to Sharing for Webmasters](https://developers.facebook.com/docs/sharing/webmasters): `og:url` is the page's canonical URL.
- [Meta for Developers: Sharing FAQ](https://developers.facebook.com/docs/sharing/webmasters/faq/): "All URLs must be absolute", and the debugger complains about relative `og:url` and `og:image`.
