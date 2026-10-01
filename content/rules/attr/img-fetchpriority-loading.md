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

## Why avoid

The HTML Standard's lazy state is "Used to defer fetching a resource until some conditions are
met": the browser watches the image and fetches it once it intersects the viewport.
`fetchpriority="high"` "Signals a high-priority fetch", and has no fetch to act on until then.

Chrome's LCP request discovery insight checks both on the Largest Contentful Paint image:
"Avoid `loading=lazy` for the image" and "Use `fetchpriority=high`". A page with both passes the
second check and fails the first.

## Use instead

Keep `fetchpriority="high"` on the image in the first viewport, and `loading="lazy"` on those
below it:

```html
<img src="/hero.jpg" fetchpriority="high" alt="Roses in bloom" width="1200" height="600">
<img src="/gallery-1.jpg" loading="lazy" alt="Pruned stem" width="400" height="300">
```

## Detectability

Detectable with one selector: both attributes hold single keywords, so `=` with the `i` flag
matches each. An `<img>` with one of the two stays quiet. There is no autofix: which attribute
goes depends on where the image sits on screen, which markup does not say.

## Resources

- [HTML Standard: lazy loading attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#lazy-loading-attributes): the lazy state defers fetching until the element intersects the viewport; the `fetchpriority` states.
- [Chrome for Developers: LCP request discovery](https://developer.chrome.com/docs/performance/insights/lcp-discovery): "Avoid `loading=lazy`" and "Use `fetchpriority=high`" on the LCP image.
