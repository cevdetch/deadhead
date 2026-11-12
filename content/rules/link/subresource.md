---
ruleId: "link/subresource"
title: "<link rel=\"subresource\">"
description: "A prefetch hint that lived in Chrome alone, never worked, and left a decade ago."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="subresource" i]'
fix: { op: "remove-tokens", attr: "rel" }
replacement: "Drop the tag, or only the keyword when rel also holds live ones. Preload through the standard relation instead: <link rel=\"preload\" href=\"/app.js\" as=\"script\">."
tags: ["resource-hints"]
impacts: ["performance"]
related: ["link/preload-as-missing"]
---

A `link rel=subresource` promises a head start and delivers nothing. Chrome removed the token in
version 50, in 2016, and no other browser ever implemented it.

The keyword came out of Chromium's SPDY work. Chrome's own description of its intent was "to
prefetch a resource during a browser's idle time", so that later requests "could simply be
retrieved from the browser cache". It never reached a standard, and the `preload` and `prefetch`
link types later took over that job with defined behaviour.

## Why avoid

Chrome's removal notice lists the reasons: "First, it never worked as intended. Referenced
resources were downloaded with low priority. The attribute was never implemented on any browser
other than Chrome. The Chrome implementation had a bug that caused resources to be downloaded
twice." Chromium's own page for the keyword now reads: "This feature has been deprecated. Web
developers should use the new Preload API."

It never entered any standard. The HTML Standard's list of supported `rel` tokens, the list
`relList.supports()` answers from, names thirteen keywords with no `subresource` among them.

A tag promising a head start while fetching nothing is worse than absent. It tells the next
reader the performance story is handled, so the real preload never gets written, and the
resource it names waits for the parser or a script to find it.

## Use instead

Pick the standard hint by when the resource is needed. A resource the current page needs early
is a `preload`, with the `as` destination the preload rules require. A resource for a page the
visitor is likely to open next is a `prefetch`:

```html
<!-- Before: no browser acts on this -->
<link rel="subresource" href="/app.js">

<!-- After: needed by this page -->
<link rel="preload" href="/app.js" as="script">

<!-- After: needed by the next page -->
<link rel="prefetch" href="/checkout.js">
```

A preload fetches the file without running it: the page still needs its
`<script src="/app.js">`. A font preload also needs `crossorigin`, since fonts are fetched in
CORS mode. Before adding either hint, check that the resource is not already discovered early: a
stylesheet or script in the head needs no preload of its own.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `rel` matches with `~=` because it is a space-separated token
set, and the `i` flag folds case. No engine acts on the token, so every match trips the rule.
The fix removes the `subresource` keyword, and the element with it when no other keyword is
left, so a `rel="subresource prefetch"` keeps its working half.

## Resources

- [Chrome: API deprecations and removals in Chrome 50](https://developer.chrome.com/blog/chrome-50-deprecations): removal plus the reasons (never worked as intended, low priority, Chrome alone, double download) and the replacement options.
- [Chromium: LINK rel=subresource](https://www.chromium.org/spdy/link-headers-and-server-hint/link-rel-subresource/): "This feature has been deprecated. Web developers should use the new Preload API."
- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): the possible supported tokens for `rel` list thirteen keywords with no `subresource` among them.
- [MDN: rel=preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload): the `as` values, `crossorigin` for fonts, and preloading without executing.
- [MDN: rel=prefetch](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/prefetch): fetching resources for a likely next navigation.
