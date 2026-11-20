---
ruleId: "attr/longdesc-lowsrc"
title: "<iframe longdesc>, <img longdesc, lowsrc>"
description: "longdesc and lowsrc are obsolete image hints; link to descriptions with a and serve progressive JPEG."
pubDate: "2026-09-19"
updatedDate: "2026-09-24"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "iframe[longdesc], img[longdesc], img[lowsrc]"
fix: { op: "none" }
replacement: "Move each longdesc description into a visible a link, then delete the attribute. Delete lowsrc and serve a progressive JPEG in src."
tags: ["media"]
impacts: ["a11y", "maintainability"]
related: ["attr/object-usemap"]
---

`lowsrc` promises help no current browser delivers, but `img[longdesc]` still reaches a screen-reader user in Firefox. WHATWG lists `iframe[longdesc]`, `img[longdesc]` and `img[lowsrc]` as obsolete, but Firefox exposes a `showlongdesc` accessibility action on `img[longdesc]` that NVDA opens with NVDA+D; deleting the attribute takes that description away. `iframe[longdesc]` and `img[lowsrc]` have no such reader.

## Why avoid

WHATWG lists the three attribute uses as obsolete with one replacement each. Section 16.2 names `longdesc` on `iframe` and `img` as obsolete: use a regular `a` element to link to the description, or an image map for images. It names `lowsrc` on `img` as obsolete: serve a progressive JPEG in `src` instead of two separate images. `lowsrc` began as a Netscape Navigator extension that painted a preview image before `src`; the HTML Standard keeps it only as a reflected IDL attribute with no fetch step, and Chromium treats it as a URL attribute and nothing more. `longdesc` does something today: Firefox's accessibility tree adds a `showlongdesc` action to any `img[longdesc]`, and NVDA maps that action to a "has long description" state, opening the URL with NVDA+D. Gecko exposes nothing for `iframe[longdesc]`.

MDN converts the first one outright. Its `longDesc` page badges the member Deprecated, calls the attribute obsolete with an uncertain future, and rewrites an `img` with `longdesc` into an `a` wrapping the image. That rewrite is the safe move: writing the description as a visible link instead of a `longdesc` attribute keeps it working everywhere, including for the Firefox and NVDA users the attribute currently serves. For `lowsrc`, MDN calls the `lowSrc` property obsolete and points at progressive formats instead; that one has no live reader to preserve.

## Use instead

Link to the description with a plain anchor:

```html
<a href="taco.html">
  <img src="taco.jpg" alt="Taco Tuesday">
</a>
```

Serve one progressive image instead of two:

```html
<img src="photo-progressive.jpg" alt="Photo">
```

## Detectability

Complete detection. The rule matches `iframe[longdesc]`, `img[longdesc]` or `img[lowsrc]`: presence of either attribute is the whole verdict, so no logic module exists. There is no autofix. Deleting `img[longdesc]` removes a long description that Firefox and NVDA still expose to a user today; a person has to move the description into a visible link before removing the attribute.

## Resources

- [WHATWG: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html): `longdesc` wants a regular `a` link and `lowsrc` wants one progressive JPEG.
- [MDN: `HTMLImageElement.longDesc`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/longDesc): badges the member Deprecated and rewrites `longdesc` markup into an `a`-wrapped image.
- [Firefox: `ImageAccessible.cpp`](https://github.com/mozilla-firefox/firefox/blob/main/accessible/generic/ImageAccessible.cpp): adds a `showlongdesc` accessibility action to an image carrying `longdesc`, and opens the URL when the action runs.
- [NVDA: `gecko_ia2.py`](https://github.com/nvaccess/nvda/blob/master/source/virtualBuffers/gecko_ia2.py): maps that action to a "has long description" state that NVDA+D opens.
