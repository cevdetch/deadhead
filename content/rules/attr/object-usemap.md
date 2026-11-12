---
ruleId: "attr/object-usemap"
title: "<object usemap>"
description: "usemap on object is obsolete; img carries client maps, so move the map there."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "object[usemap]"
fix: { op: "remove-attribute", attr: "usemap" }
replacement: "Delete the attribute and move the map to img: <img src=\"shapes.png\" usemap=\"#shapes\" alt=\"Shapes\">."
tags: ["embedding", "media"]
impacts: ["maintainability"]
related: ["attr/input-ismap-usemap"]
---

`usemap` on `object` points at a map that browsers no longer apply there. The HTML Standard
lists the attribute as obsolete with one replacement: "Use the img element for image maps."

HTML 4.01 allowed `usemap` on `IMG`, `INPUT` and `OBJECT`, from the period when `<object>` was
meant to become the general way to embed anything, images included. Client-side image maps
stayed with `<img>` in practice, and HTML5 kept them there.

## Why avoid

The HTML Standard's image map processing model starts "If an img element has a usemap attribute
specified", and covers no other element. Its list of non-conforming features names `usemap` on
`object` and on `input` elements together: "Use the img element for image maps." A `useMap` IDL
attribute remains on `HTMLObjectElement` for script, and MDN marks it deprecated.

The map does nothing in Chrome. In a probe on 2026-11-12, Chrome 156 hit-tested the `<area>` of
a map attached to an `<img>`, and the `<object>` itself for the same kind of map attached to an
`<object>`: the areas were not there to click. Firefox's support is less clear: Mozilla bug
392994, "Remove support for `<input usemap>` and `<object usemap>`", is still open. A page that
relies on the map works in one engine at most, and the standard defines no behaviour for it.

## Use instead

Move the image and its map to `img`, where every browser applies it:

```html
<!-- Before -->
<object data="shapes.png" type="image/png" usemap="#shapes">
  <p>Fallback content.</p>
</object>

<!-- After -->
<img src="shapes.png" usemap="#shapes" alt="Shapes">
<map name="shapes">
  <area shape="rect" coords="25,25,125,125" href="red.html" alt="Red box">
</map>
```

Each `<area>` needs `alt` text, since it is a link with no other label. For an SVG image, links
inside the SVG itself (`<a>` around shapes) do the job of a map and scale with the image.

## Detectability

Detectable with one selector: `object[usemap]`. Presence of the attribute is the whole verdict,
so no logic module exists. The CLI, the bookmarklet and the ESLint plugin report the same
findings, and none skips. The autofix removes the attribute and leaves the `<object>` and the
`<map>` alone; moving the image to `<img>` is the author's change. `attr/input-ismap-usemap`
covers the same attribute on `input`.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `usemap` on `input` and `object` elements, "Use the img element for image maps."
- [HTML Standard: image maps](https://html.spec.whatwg.org/multipage/image-maps.html#image-map-processing-model): the processing model applies to `img` elements with `usemap`.
- [MDN: `HTMLObjectElement.useMap`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLObjectElement/useMap): marked deprecated.
- [Mozilla bug 392994](https://bugzilla.mozilla.org/show_bug.cgi?id=392994): "Remove support for `<input usemap>` and `<object usemap>`", open.
