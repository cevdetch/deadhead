---
ruleId: "meta/mobile-optimized"
title: "<meta name=\"MobileOptimized\">"
description: "Internet Explorer Mobile hint that a page suits small screens; you control small-screen layout with viewport."
pubDate: "2026-09-19"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="MobileOptimized" i]'
fix: { op: "remove-element" }
replacement: "Delete it. Control small-screen layout with <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."
tags: ["mobile"]
impacts: ["maintainability"]
related: ["meta/handheld-friendly", "meta/viewport-user-scalable"]
---

`<meta name="MobileOptimized">` tells Internet Explorer Mobile that the page suits a small
screen. No current browser acts on the hint, and `<meta name="viewport">` does the job it was
reaching for.

The value was a width in pixels, such as `content="320"`: the page was laid out for a screen
that wide, and the browser could skip its desktop-to-phone reformatting. The WHATWG
MetaExtensions registry describes the name as controlling "layout behavior in older versions of
Internet Explorer (e.g., 6.5)", the browser of Windows Mobile 6.5. Windows Phone 7 kept reading
it: Microsoft's 2011 guide says the browser resizes the layout viewport for pages that "use the
MobileOptimized or the HandheldFriendly META tags". The archived Mobile Boilerplate, a template
for phone sites, still sets it to 320 in its `index.html`.

## Why avoid

Its readers shipped on Windows Mobile and Windows Phone, neither of which has a current release.
The registry lists the name as a Proposal with Windows Mobile 6.5 documentation as its only
reference, and the HTML Standard's list of metadata names leaves it out.

Microsoft pointed away from it in the same guide. It explains layout width through the viewport
tag, `width=device-width` included, and lists `MobileOptimized` under "Alternative ways to
change the size of the viewport", as one signal for the browser's automatic resizing. A fixed
`320` is also the wrong model for current phones, whose viewports vary in width and change with
orientation.

Current browsers skip a `meta` name they do not recognise, so the tag is bytes in every response
and a false lead for whoever maintains the head next. In the top 10,000 crawl of 2026-10-04, 225
of the 4,570 home pages linted from their served HTML still carried it.

## Use instead

Delete the element and keep the viewport tag:

```html
<!-- Before: a fixed 320-pixel hint beside the viewport tag -->
<meta name="MobileOptimized" content="320">
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- After -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

The viewport tag sets the layout width to the device's, and CSS media queries and flexible
layout do the rest. The CSS Viewport Module standardises the tag's properties and parsing.

## Detectability

Detectable with one selector, `meta[name="MobileOptimized" i]`: the name is one value, not a
token list, so an exact match ignoring ASCII case is the whole test. The CLI, the bookmarklet
and the ESLint plugin report the same findings, and none skips. The `content` width plays no
part in the verdict. The autofix deletes the element; a missing viewport tag is
`head/viewport-missing`'s finding, not this rule's.

## Resources

- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): `MobileOptimized` as a Proposal for layout control in old Internet Explorer, with a Microsoft Windows Mobile 6.5 doc.
- [Microsoft Windows Developer Blog: Managing the Windows Phone Browser Viewport (March 2011)](https://blogs.windows.com/windowsdeveloper/2011/03/14/managing-the-windows-phone-browser-viewport/): layout width through the viewport tag, with `MobileOptimized` among the "Alternative ways to change the size of the viewport".
- [h5bp Mobile Boilerplate, archived: `index.html`](https://github.com/h5bp/mobile-boilerplate/blob/master/index.html): the boilerplate head with `MobileOptimized` set to 320 beside the viewport tag.
- [W3C: CSS Viewport Module Level 1](https://www.w3.org/TR/css-viewport-1/): the draft standardises viewport `width`, `initial-scale`, and sibling properties with a parsing algorithm.
