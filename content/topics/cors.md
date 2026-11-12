---
description: "Where the HTML head needs crossorigin: font and fetch preloads that download twice, and integrity checks that block a CDN file."
---

Most of what the head loads needs no CORS. A stylesheet, a classic script or an image from
another origin is fetched in `no-cors` mode, and the page can use it without reading its
bytes. Two features change that, and both go wrong quietly in markup.

The first is preloading. A preload is used only when a later request matches it on URL,
destination, request mode and credentials mode, as the HTML Standard
[defines it](https://html.spec.whatwg.org/multipage/links.html#consume-a-preloaded-resource).
Fonts are always fetched in CORS mode, even from your own origin, and so is a plain
`fetch()`. A `<link rel="preload">` for either without `crossorigin` goes out in `no-cors`
mode and matches nothing, so the file downloads twice: once early and unused, once when the
page asks for it.

The second is
[Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity).
With `integrity` on a cross-origin classic script or stylesheet, the browser has to read the
response to hash it. Without `crossorigin` the response is opaque, so the browser blocks the
file, and whatever depends on it breaks.

The repair is the same attribute each time: a bare `crossorigin`, which means `anonymous`.
A cross-origin host must also answer with `Access-Control-Allow-Origin`, or the CORS request
fails in turn. Deadhead reports the three cases as harmful:

- [`link/preload-font-crossorigin-missing`](/rules/link/preload-font-crossorigin-missing)
- [`link/preload-fetch-crossorigin-missing`](/rules/link/preload-fetch-crossorigin-missing)
- [`attr/integrity-without-crossorigin`](/rules/attr/integrity-without-crossorigin),
  reported as possible: markup alone cannot tell whether an absolute URL is on another
  origin.

None has an autofix, because the repair adds an attribute and deadhead's fixes only remove.
MDN's [`crossorigin` reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin)
covers the values, including `use-credentials`.
