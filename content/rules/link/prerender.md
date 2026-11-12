---
ruleId: "link/prerender"
title: "<link rel=\"prerender\">"
description: "prerender triggers no render; use Speculation Rules for the next page."
pubDate: "2026-09-16"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="prerender" i]'
fix: { op: "none" }
replacement: "Add a Speculation Rules prerender rule for the next page first, then delete the prerender token."
tags: ["resource-hints"]
impacts: ["interop", "performance"]
related: []
---

`<link rel="prerender">` no longer prerenders anything. Chrome maps it to NoState Prefetch: a
background fetch of the target page and its subresources, with no render and no script run.
Speculation Rules replace it for prerender work.

Chrome added the hint in version 13, in 2011, and rendered the whole target page in a hidden
tab. Internet Explorer 11 read it too. Chrome 63 replaced full prerendering with NoState
Prefetch, which fetches the page and its subresources and stops there: "The goal of NoState
Prefetch is to use less memory than prerendering, while still reducing page load times." Firefox
and Safari never read the keyword. When Chrome brought full prerendering back, it chose a new
syntax for it: Speculation Rules, from Chrome 105.

## Why avoid

Chrome's prerender documentation describes the old syntax as one that "remains in place for
NoState Prefetch, with a view of retiring this at some point in the future". NoState Prefetch
"won't deliver an instant page load like a full prerender would", and since October 2025 Chrome
calls it deprecated: it "will likely be removed from Chrome in the future". The tag promises one
thing, does a smaller one in one engine, and is on its way out of that one too.

No spec defines the keyword. MDN carries no spec section for it and badges it Deprecated plus
Non-standard; MDN's compatibility data lists Chrome and Edge with a partial implementation and
no support in Firefox or Safari.

The fetch is still real. Chrome downloads the target and its subresources whether or not the
visitor follows the link, so a `prerender` hint on a page the visitor seldom opens spends their
data for nothing.

## Use instead

Declare the next page in a speculation rule set first, then delete the `prerender` token by
hand. There is no autofix, and deleting the token before adding the rule stops the current fetch
with nothing prefetching in its place:

```html
<!-- Before: NoState Prefetch in Chrome, nothing elsewhere -->
<link rel="prerender" href="/next">

<!-- After -->
<script type="speculationrules">
{
  "prerender": [{
    "where": { "href_matches": "/next" },
    "eagerness": "moderate"
  }]
}
</script>
```

`moderate` eagerness waits for a sign of intent, such as the pointer resting on the link, which
keeps the cost close to the pages people open. A `prefetch` rule in place of `prerender` fetches
the document alone, at a lower cost, and is the form Safari supports. A page that wants a plain
fetch hint in every engine can use `<link rel="prefetch" href="/next">`, which Chrome, Edge and
Firefox support and which, like NoState Prefetch, renders nothing.

## Detectability

Detectable with one selector: each `link` whose `rel` token set includes `prerender`, matched
with `~=` because `rel` is a space-separated token set, the same reasoning as `link/image-src`.
The CLI, the bookmarklet and the ESLint plugin report the same findings, and none skips.

There is no autofix. Chrome still runs a NoState Prefetch fetch from the token, with no removal
milestone announced; deleting the token with no equivalent Speculation Rules entry stops that
fetch with nothing prefetching in its place. `script/speculationrules-syntax` checks the rule
set that replaces it.

## Resources

- [MDN: rel="prerender"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/prerender): badges the keyword Deprecated and Non-standard, records no spec definition, and points to the Speculation Rules API as successor.
- [Chrome for Developers: prerender pages](https://developer.chrome.com/docs/web-platform/prerender-pages): the link syntax "remains in place for NoState Prefetch, with a view of retiring this at some point in the future", and Speculation Rules as the path for full prerender.
- [Chrome for Developers: introducing NoState Prefetch](https://developer.chrome.com/blog/nostate-prefetch): the switch from full prerendering in Chrome 63, "to use less memory than prerendering"; the October 2025 note that NoState Prefetch "is considered deprecated and will likely be removed from Chrome in the future".
- [MDN: speculative loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading): `rel=prerender` as deprecated, and Speculation Rules prerender as the replacement.
- [MDN browser-compat-data: `html.elements.link.rel`](https://github.com/mdn/browser-compat-data/blob/main/html/elements/link.json): `prerender` full in Chrome 13 to 62, NoState Prefetch from 63, Internet Explorer 11, no Firefox or Safari; `prefetch` in Chrome, Edge and Firefox.
