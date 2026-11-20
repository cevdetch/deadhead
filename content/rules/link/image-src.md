---
ruleId: "link/image-src"
title: "<link rel=\"image_src\">"
description: "A pre-Open Graph hint for social preview images that was never accepted as a link relation and is no longer read."
pubDate: "2026-09-09"
updatedDate: "2026-09-23"
status: "avoid"
severity: "unnecessary"
standardsBasis: "community"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="image_src" i]'
fix: { op: "remove-tokens", attr: "rel" }
replacement: "Declare the preview image with Open Graph: <meta property=\"og:image\" content=\"https://example.com/cover.jpg\">."
tags: ["social"]
impacts: ["seo", "maintainability"]
related: ["link/shortcut-icon"]
---

`<link rel="image_src">` is dead: nothing reads it. For a couple of years either side of 2009,
the way to tell another site which image to
show alongside a link to yours was `<link rel="image_src">`. Yahoo! Search used it to
fill a 54×98 pixel thumbnail beside a result, and Facebook read it when someone shared a
URL. It arrived before Open Graph existed, was proposed as a link relation, and never got
any further.

## Why avoid

It is not a link relation and never was. The rel registry that the HTML Standard points
to for extensions still carries `image_src`, with its status at `proposed` and its
specification column reading `Unknown`, with a note alongside that it is "probably redundant
with `rel=icon`". A browser tokenises `rel`, fails to recognise the keyword, and discards
it, exactly as it does with `shortcut`.

The sites it was written for are gone. Facebook shipped the Open Graph protocol in 2010
and `og:image` replaced this mechanism wholesale; the Yahoo! Search thumbnail feature it
fed no longer exists. Nothing in a modern stack reads the element. Browsers discard the
unrecognised keyword, and the scrapers that once read it moved to Open Graph in 2010.

What is left is worse than inert, because it looks authoritative. A page carrying both
`image_src` and `og:image` states its preview image twice, the two can drift apart, and
only one of them is ever read. The next person to change the site's share image has two
places to look and no way to tell from the markup which one matters.

## Use instead

Open Graph, which every major sharer and search surface consumes:

```html
<meta property="og:image" content="https://example.com/cover.jpg">
<meta property="og:image:alt" content="A description of the image">
```

Nothing else is needed. If a specific network wants a different crop, add that network's
own tag next to it rather than reviving a generic one.

## Detectability

Fully detectable. The rule matches with `~=` because `rel` is a space-separated token set and
that is how a browser parses it, the same reasoning as `link/shortcut-icon`, even though
`image_src` is almost always the only token present.

The fix removes the element outright, which is safe here in a way it is not for a legacy
favicon spelling: deleting this takes nothing working with it, because nothing reads it.
That is the difference between a keyword a browser discards inside an attribute that
still does a job, and an element whose whole purpose has been superseded.

## Resources

- [microformats: existing rel values](http://microformats.org/wiki/existing-rel-values): the official `rel` registry named by the HTML Standard; lists `image_src` as `proposed`, specification `Unknown`.
- [HTML Standard: other link types](https://html.spec.whatwg.org/multipage/links.html#other-link-types): establishes that registry as where `rel` extensions are recorded, and what happens to keywords outside it.
- [Niall Kennedy: "Create enhanced results on Yahoo! and Facebook with Share markup" (16 March 2009)](http://www.niallkennedy.com/blog/2009/03/enhanced-social-share.html): contemporaneous primary documentation of the mechanism and its consumers.
- [The Open Graph protocol](https://ogp.me/): the replacement.
