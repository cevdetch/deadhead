---
ruleId: "link/preload-as-missing"
title: "<link rel=\"preload\"> without as"
description: "A preload with no as fetches nothing; add as so the resource loads in time."
pubDate: "2026-09-13"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: 'link[rel~="preload" i]:not([as]):not([rel~="stylesheet" i])'
fix: { op: "none" }
replacement: "Say what the resource is: <link rel=\"preload\" href=\"/hero.avif\" as=\"image\">. Fonts also need type and crossorigin."
tags: ["resource-hints"]
impacts: ["performance"]
related: ["link/preload-font-crossorigin-missing", "link/preload-fetch-crossorigin-missing"]
---

A preload without `as` fetches nothing. `<link rel="preload" href="/fonts/inter.woff2">`
looks like it tells the browser to start
downloading a critical resource early. Without `as`, it tells the browser nothing it can
act on, so the browser does nothing. The resource arrives exactly when it would have with no
hint at all, and the only trace is a warning in the console.

## Why avoid

The attribute isn't optional. The HTML Standard says `as` "must be specified on link
elements that have a rel attribute that contains the preload keyword", with a value that
is a preload destination: `fetch`, `font`, `image`, `script`, `style` or `track`. There is
no default. A missing value maps to no state.

Without a destination, there is no preload. The destination is part of how a preloaded
response is matched to the real request later, and the Standard's processing translates
`as` into one before fetching. A value that isn't a preload destination translates to
null, and the preload stops there without making a request. Chromium does the same: it
logs ``<link rel=preload> must have a valid `as` value`` as a console warning and
returns before fetching anything.

That makes it harmful. A preload marks the one resource that
matters most for this navigation: the hero image that becomes the Largest Contentful Paint,
the font the first paint waits on, the CSS above the fold. With `as` missing, the parser or
the style engine finds and fetches that resource at normal priority whenever it gets to it. The
optimisation the markup promises silently doesn't happen, nothing on the page shows it, and
so it ships.

A correct `as` does more than turn the preload on. It sets the right `Accept` header, makes
the right Content-Security-Policy directive apply, and lets the browser reuse the preloaded
response instead of fetching it again.

## Use instead

```html
<link rel="preload" href="/css/above-the-fold.css" as="style">
<link rel="preload" href="/img/hero.avif" as="image" fetchpriority="high">
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

Fonts are fetched in CORS mode, so a font preload also needs `crossorigin` or it won't be
reused. See `link/preload-font-crossorigin-missing`.

## Detectability

Fully detectable. The rule matches a `preload` token in `rel`, which is a token set,
on a `<link>` with no `as` attribute at all. An `as` that is present but empty or not a
destination, like `as="stylesheet"`, has the same outcome but isn't caught by this rule.

`rel="preload stylesheet"` stays quiet: the `stylesheet` token loads the file anyway.
There is no autofix. The fix adds a value, and only the author knows what the resource is.

## Resources

- [HTML Standard: the as attribute](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-as): "must be specified" on `rel=preload`, with a preload destination as its value; no missing value default.
- [HTML Standard: link type "preload"](https://html.spec.whatwg.org/multipage/links.html#link-type-preload): the preload key includes the destination; a value that isn't a preload destination translates to null and nothing is fetched.
- [Chromium: `third_party/blink/renderer/core/loader/preload_helper.cc`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/loader/preload_helper.cc): the "must have a valid `as` value" console warning, and the return before any fetch.
- [MDN: rel=preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload): what `as` lets the browser do: cache reuse, the right CSP, the right `Accept` header; `crossorigin` for fonts.
