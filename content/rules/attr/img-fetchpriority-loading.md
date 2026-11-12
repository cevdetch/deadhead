---
ruleId: "attr/img-fetchpriority-loading"
title: "<img loading=\"lazy\" fetchpriority=\"high\">"
description: "A lazy image waits until it nears the viewport, so fetchpriority=\"high\" cannot move it up; the LCP image loads late."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "body"
selector: 'img[loading="lazy" i][fetchpriority="high" i]'
fix: { op: "none" }
replacement: "Keep one: drop loading=\"lazy\" from an image in the first viewport, or drop fetchpriority=\"high\" from one below it."
tags: ["resource-hints"]
impacts: ["performance"]
related: ["link/preload-as-missing"]
---

An `<img>` with both `loading="lazy"` and `fetchpriority="high"` waits before it loads. A lazy
image does not start fetching until it nears the viewport, so the high priority applies to a
request that starts late. The author marked the image as the one that matters, and the page
delays it.

The pair can come from two layers that each add one attribute: a CMS or image component that
lazy-loads every image by default, and a template or performance plugin that marks the hero
`high`. Each attribute is right on its own image; on the same image they cancel out.

## Why avoid

The HTML Standard's lazy state is "Used to defer fetching a resource until some conditions are
met": the browser watches the image with an intersection observer and fetches it once it comes
within an implementation-defined scroll margin of the viewport. `fetchpriority="high"` "Signals
a high-priority fetch", and has no fetch to act on until then. web.dev describes the pair in
those terms: the image "is still delayed while it's off-screen, and then fetched with a high
priority when it's almost within the viewport". By then the browser "would likely load that
image with high priority anyway", so the attribute buys nothing.

The wait is longer than it looks for an image that is already on screen. web.dev: "The browser
can't lazy-load an image until it knows where the image should be on the page, which causes them
to load more slowly." An eager image can start as soon as the parser, or the preload scanner
ahead of it, sees the tag. A lazy one waits for layout, and layout waits for the stylesheets in
the head. In a web.dev study of WordPress pages, the median page with lazy loading had a
75th-percentile Largest Contentful Paint of 3,768 ms, against 3,495 ms for the median page
without it. Eager loading for the images above the fold removed the regression and kept the byte
savings.

Chrome's LCP request discovery insight checks both on the Largest Contentful Paint image: "Avoid
`loading=lazy` for the image" and "Use `fetchpriority=high`". A page with both passes the second
check and fails the first.

The outcome also depends on the visitor. The standard's lazy-loading steps start with "If
scripting is disabled for element, then return false", an anti-tracking measure: with JavaScript
off the image loads at once, at high priority. Testing in one setup and shipping to another
hides the delay.

## Use instead

Decide where the image sits. In the first viewport, it is a candidate for Largest Contentful
Paint: keep `fetchpriority="high"` and drop `loading="lazy"`. There is no need to write
`loading="eager"`: it is the default, and web.dev notes it loads the image no faster than no
attribute. Below the fold, keep `loading="lazy"` and drop `fetchpriority="high"`:

```html
<!-- Before: the hero waits for layout, then loads at high priority -->
<img src="/hero.jpg" loading="lazy" fetchpriority="high" alt="Roses in bloom" width="1200" height="600">

<!-- After -->
<img src="/hero.jpg" fetchpriority="high" alt="Roses in bloom" width="1200" height="600">
<img src="/gallery-1.jpg" loading="lazy" alt="Pruned stem" width="400" height="300">
```

When the layout differs between devices, so that the image is above the fold on a phone and
below it on a desktop, eager loading is the safer default for that one image. Chrome fetches
lazy images well before they are visible, at 1250 px from the viewport on fast connections and
2500 px on slower ones, so a lazy image near the fold saves little. In a CMS, fix it where the
attributes come from: exclude the hero from the lazy-loading default.

## Detectability

Detectable with one selector: both attributes hold single keywords, so `=` with the `i` flag
matches each. The CLI, the bookmarklet and the ESLint plugin report the same findings, and none
skips. An `<img>` with one of the two stays quiet, and so does an `<iframe loading="lazy">`,
which takes no `fetchpriority`. There is no autofix: which attribute goes depends on where the
image sits on screen, which markup does not say.

## Resources

- [HTML Standard: lazy loading attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#lazy-loading-attributes): the lazy state defers fetching until the element intersects the viewport, within an implementation-defined "lazy load scroll margin"; the will lazy load element steps return false when scripting is disabled.
- [HTML Standard: fetch priority attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#fetch-priority-attributes): `high` "Signals a high-priority fetch relative to other resources with the same destination".
- [Chrome for Developers: LCP request discovery](https://developer.chrome.com/docs/performance/insights/lcp-discovery): "Avoid `loading=lazy`" and "Use `fetchpriority=high`" on the LCP image.
- [web.dev: Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading): a lazy, high-priority image "is still delayed while it's off-screen"; the 1250 px and 2500 px thresholds; eager loading for "images that are visible when the user first loads the page, and especially for LCP images".
- [web.dev: Data-driven advice for lazy loading images with Core Web Vitals in mind](https://web.dev/articles/lcp-lazy-loading): 75th-percentile LCP of 3,768 ms for the median WordPress page with lazy loading and 3,495 ms without; "Lazy loading only the images below the fold results in a complete reversal of the LCP regression".
