---
ruleId: "meta/handheld-friendly"
title: "<meta name=\"HandheldFriendly\">"
description: "Early hint that a page suits small screens; you control small-screen layout with viewport."
pubDate: "2026-09-19"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="HandheldFriendly" i]'
fix: { op: "remove-element" }
replacement: "Delete it. Control small-screen layout with <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."
tags: ["mobile"]
impacts: ["maintainability"]
related: ["meta/mobile-optimized", "meta/viewport-user-scalable"]
---

`<meta name="HandheldFriendly">` tells an old phone browser that the page suits a small screen.
No current browser acts on the hint, and `<meta name="viewport">` does the job it was reaching
for.

The name comes from the years before the iPhone, when phone browsers reformatted desktop pages
to fit and a page needed a way to say it was already built for a phone. The BlackBerry browser
read it; the WHATWG MetaExtensions registry describes it as informing "the BlackBerry browser
that the content contained within the document is designed for small screens". Microsoft's
Windows Phone 7 also resized the layout viewport for pages that "use the MobileOptimized or the
HandheldFriendly META tags". Boilerplates carried it into the 2010s: the archived Mobile
Boilerplate's `index.html` still ships it, beside `MobileOptimized` and a viewport tag.

## Why avoid

The browsers that read it are gone. BlackBerry's browser and Windows Phone have no current
releases, and the registry holds the name as a Proposal whose vendor documentation it marks
"largely obsolete". No standard adopted it: the HTML Standard's metadata names do not include
it.

A browser that does not know a `meta` name ignores the element. The skip costs nothing and gains
nothing, but the element ships in every page, and it signals to the next maintainer that
small-screen layout depends on it. In the top 10,000 crawl of 2026-10-04, 285 of the 4,570 home
pages linted from their served HTML still carried it.

Small-screen layout belongs to the viewport tag and to CSS. Apple introduced
`<meta name="viewport">` for the iPhone and documents `width=device-width` for pages built for
phones; every current mobile browser reads it, and the CSS Viewport Module standardises its
properties and parsing. A responsive page is laid out by media queries and flexible layout under
that viewport, which a yes-or-no hint never could.

## Use instead

Delete the element and keep the viewport tag:

```html
<!-- Before: two retired hints beside the viewport tag -->
<meta name="HandheldFriendly" content="True">
<meta name="MobileOptimized" content="320">
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- After -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

## Detectability

Detectable with one selector: `name` holds a single value, so `=` with the `i` flag matches it,
and `handheldfriendly` in any case reports. The CLI, the bookmarklet and the ESLint plugin
report the same findings, and none skips. A page without the element stays quiet; this rule does
not check that a viewport tag exists, which `head/viewport-missing` does. The fix removes the
element: no current browser reads it.

## Resources

- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): `HandheldFriendly` as a Proposal for the BlackBerry browser, with vendor documentation marked "largely obsolete".
- [Microsoft Windows Developer Blog: Managing the Windows Phone Browser Viewport (March 2011)](https://blogs.windows.com/windowsdeveloper/2011/03/14/managing-the-windows-phone-browser-viewport/): Windows Phone 7 resizes the layout viewport for pages with `MobileOptimized` or `HandheldFriendly`, and recommends the viewport tag.
- [h5bp Mobile Boilerplate, archived: `index.html`](https://github.com/h5bp/mobile-boilerplate/blob/master/index.html): the boilerplate head with `HandheldFriendly`, `MobileOptimized` and the viewport tag.
- [Apple Developer: Configuring the Viewport (Safari Web Content Guide)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html): Apple tells authors to set viewport width with `width=device-width` for pages built for phones.
- [W3C: CSS Viewport Module Level 1](https://www.w3.org/TR/css-viewport-1/): the draft standardises viewport `width`, `initial-scale`, and sibling properties with a parsing algorithm.
