---
ruleId: "link/hreflang-relative"
title: "<link rel=\"alternate\" hreflang> with relative href"
description: "Google needs fully-qualified hreflang URLs; a relative href drops that language version from the set."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="alternate" i][hreflang][href]'
match: "logic"
fix: { op: "none" }
replacement: "Write the full URL: <link rel=\"alternate\" hreflang=\"de\" href=\"https://example.com/de/\">."
tags: ["i18n", "search"]
impacts: ["seo"]
related: ["link/canonical-relative", "link/hreflang-value"]
---

A `<link rel="alternate" hreflang>` with a relative `href` breaks Google's hreflang requirement,
and the language version it names can drop out of the set. Searchers in that locale can land on
the wrong version.

Hreflang annotations tell a search engine which URLs are the same page in other languages or for
other regions. Each version lists itself and every other version, and Google uses the set to
send a searcher to the version for their language and region. The links do nothing in the
browser: no visitor follows them and no request goes out.

## Why avoid

Google: "Alternate URLs must be fully-qualified, including the transport method (http/https)."
Its examples spell it out: `https://example.com/foo`, "not `//example.com/foo` or `/foo`".
Lighthouse's hreflang audit fails the same tag with "Relative href value". The HTML Standard
allows a relative `href`; the absolute-URL requirement comes from Google's documentation of
hreflang.

Nothing shows the fault. The browser resolves the relative URL against the page and moves on,
and an HTML validator passes it, since the markup is valid. Search Console's International
Targeting report, which once listed hreflang errors, is deprecated. Google documents the
annotation for fully-qualified URLs alone, and a relative one falls outside what it says it
reads.

The set depends on every page. Google pairs the annotations: "If two pages don't both point to
each other, the tags will be ignored." A relative link on a shared template sits on every page
of the set, so the version it names rests on links outside Google's documented format everywhere
at once.

## Use instead

Write each alternate as a full URL, scheme included, and list the page itself and an `x-default`
alongside the other versions:

```html
<!-- Before: relative and protocol-relative alternates -->
<link rel="alternate" hreflang="en" href="/en/">
<link rel="alternate" hreflang="de" href="//example.com/de/">

<!-- After -->
<link rel="alternate" hreflang="en" href="https://example.com/en/">
<link rel="alternate" hreflang="de" href="https://example.com/de/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
```

Build the URLs from the site's configured origin, the same value a canonical uses, so that a
page rendered behind a proxy or on a staging host does not carry that host into the set. Google
also reads hreflang from an HTTP `Link` header and from the sitemap, and both take full URLs as
well. A large site can move the set into the sitemap, where it changes in one file and leaves
the pages alone.

## Detectability

Detectable with logic refining the selector: an `alternate` token in `rel`, a `hreflang`, and an
`href` that, trimmed as the URL parser trims it, starts with no scheme. The CLI, the bookmarklet
and the ESLint plugin report the same findings, and none skips. `android-app://` is absolute. A
protocol-relative `//example.com/de/` reports, since Google wants the transport method. A link
with no `href` belongs to `link/href-missing`, and a malformed `hreflang` value to
`link/hreflang-value`. A `<base>` does not change the finding: Google asks for the full URL in
the annotation itself. There is no autofix: an absolute URL needs the site's origin.

## Resources

- [Google Search Central: localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions): "Alternate URLs must be fully-qualified, including the transport method"; "If two pages don't both point to each other, the tags will be ignored"; the HTML, HTTP header and sitemap methods.
- [Lighthouse: hreflang audit source](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/seo/hreflang.js): the `notFullyQualified` failure, "Relative href value".
- [HTML Standard: the `link` element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): the `href` value "must be a valid non-empty URL potentially surrounded by spaces", which admits relative URLs.
- [Search Console Help: the International Targeting report is deprecated](https://support.google.com/webmasters/answer/12474899): the report is gone, and Google still uses hreflang.
