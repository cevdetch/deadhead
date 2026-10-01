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
selector: 'link[rel~="alternate" i][hreflang][href]:not([href^="http://" i]):not([href^="https://" i])'
fix: { op: "none" }
replacement: "Write the full URL: <link rel=\"alternate\" hreflang=\"de\" href=\"https://example.com/de/\">."
tags: ["i18n", "search"]
impacts: ["seo"]
related: ["link/canonical-relative", "link/hreflang-value"]
---

A `<link rel="alternate" hreflang>` with a relative `href` breaks Google's hreflang requirement,
and the language version it names drops out of the set. Searchers in that locale can land on
the wrong version.

## Why avoid

Google: "Alternate URLs must be fully-qualified, including the transport method (http/https)."
Lighthouse's hreflang audit fails the same tag with "Relative href value". The HTML Standard
allows a relative `href`; the requirement is Google's, and hreflang is Google's convention.

## Use instead

```html
<link rel="alternate" hreflang="en" href="https://example.com/en/">
<link rel="alternate" hreflang="de" href="https://example.com/de/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
```

## Detectability

Detectable with one selector: an `alternate` token in `rel`, a `hreflang`, and an `href` that
starts with neither `http://` nor `https://`. A protocol-relative `//example.com/de/` reports,
since Google wants the transport method. A link with no `href` belongs to `link/href-missing`.
There is no autofix: an absolute URL needs the site's origin.

## Resources

- [Google Search Central: localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions): "Alternate URLs must be fully-qualified, including the transport method".
- [Lighthouse: hreflang audit source](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/seo/hreflang.js): the `notFullyQualified` failure, "Relative href value".
