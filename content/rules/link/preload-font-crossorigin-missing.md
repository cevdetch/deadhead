---
ruleId: "link/preload-font-crossorigin-missing"
title: "<link rel=\"preload\" as=\"font\"> without crossorigin"
description: "Fonts are always fetched in CORS mode; a font preload without crossorigin doesn't match that request, so the font is downloaded twice."
pubDate: "2026-09-13"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: 'link[rel~="preload" i][as="font" i]:not([crossorigin])'
fix: { op: "none" }
replacement: "Add crossorigin to every font preload, same-origin or not: <link rel=\"preload\" href=\"/fonts/inter.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>."
tags: ["cors", "resource-hints"]
impacts: ["performance"]
related: ["link/preload-as-missing", "link/preload-fetch-crossorigin-missing"]
---

`<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2">` is the font
preload almost everyone writes first, and it does the opposite of what it's for. The browser
downloads the font early, as asked. Then the stylesheet asks for the same font, the browser
decides the early copy doesn't match, and downloads it again.

## Why avoid

Fonts are fetched in CORS mode, always. The CSS Fonts specification's font fetching
requirements fetch every `@font-face` URL with destination "font" and CORS mode "cors",
whether the font is on another origin or on your own. Nothing about the page changes that.

A preload is only used if it matches the request that follows. The HTML Standard keys
preloaded responses on four things: the URL, the destination, the request mode and the
credentials mode. A `<link rel="preload">` without `crossorigin` makes a `no-cors` request.
When the stylesheet's `cors` request for the same font arrives, its key doesn't match, so
the preloaded copy is never consumed. Chromium says as much in the console: "A preload for
'…' is found, but is not used because the request mode does not match. Consider taking a
look at crossorigin attribute."

The page pays for the font twice. web.dev puts it bluntly: "Fonts preloaded without the
crossorigin attribute will be fetched twice!" Tens of kilobytes of WOFF2 are downloaded
early and thrown away, at high priority, competing with the critical CSS and images the
preload was meant to make room for. The text still waits for the second copy.

## Use instead

```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

A bare `crossorigin` means `anonymous`, which matches the font's own request. Add it even
for fonts on your own origin. MDN: the attribute "needs to be set to match the resource's
CORS and credentials mode, even when the fetch is not cross-origin". A cross-origin font
also needs `Access-Control-Allow-Origin` on its response, preload or not.

## Detectability

Fully detectable. The rule matches a `preload` token in `rel`, `as="font"`
case-insensitively, and no `crossorigin` attribute at all.

`crossorigin="use-credentials"` mismatches too, because it sends credentials the font
request doesn't, but this rule doesn't catch it. There is no autofix: the fix adds an
attribute, and every fix here only removes.

## Resources

- [CSS Fonts Module Level 4: font fetching requirements](https://drafts.csswg.org/css-fonts-4/#font-fetching-requirements): fonts are fetched with destination "font" and CORS mode "cors".
- [HTML Standard: link type "preload"](https://html.spec.whatwg.org/multipage/links.html#link-type-preload): preloaded responses are keyed on URL, destination, mode and credentials mode.
- [Chromium: `resource_fetcher.cc`, `PrintPreloadMismatch`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/loader/fetch/resource_fetcher.cc): "is found, but is not used because the request mode does not match. Consider taking a look at crossorigin attribute."
- [web.dev: Preload critical assets to improve loading speed](https://web.dev/articles/preload-critical-assets): "Fonts preloaded without the crossorigin attribute will be fetched twice!"
- [MDN: rel=preload: CORS-enabled fetches](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload#cors-enabled_fetches): `crossorigin` must match the resource's CORS and credentials mode even for same-origin fetches.
