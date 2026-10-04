---
ruleId: "attr/a-coords-shape"
title: "<a coords, shape>"
description: "coords and shape do nothing on anchors; delete them and use area elements for image maps."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: 'a[coords], a[shape][shape="rect" i], a[shape][shape="rectangle" i], a[shape][shape="circle" i], a[shape][shape="circ" i], a[shape][shape="poly" i], a[shape][shape="polygon" i], a[shape][shape="default" i]'
fix: { op: "remove-attributes" }
replacement: "Delete the attributes: <a href=\"page.html\">text</a>. For image maps use area elements with shape and coords inside map."
tags: ["hyperlinks"]
impacts: ["maintainability"]
related: ["attr/area-hreflang-type-nohref"]
---

`coords` and `shape` do nothing on anchors. WHATWG lists both as obsolete on `a` with one direction, use `area` for image maps, so the attributes are dead weight on every anchor that carries them.

## Why avoid

WHATWG lists both as obsolete with one replacement. Section 16.2 names `coords` on `a` elements and `shape` on `a` elements as obsolete, with a single direction: use `area` instead of `a` for image maps. The attributes sit in the non-conforming part of the page ("entirely obsolete, must not be used by authors"). An anchor carrying them links as it would without them; no shape is layered, no region becomes clickable.

The compat IDL changes nothing. Section 16.3.3 keeps reflecting `coords` and `shape` IDL members on anchors for old scripts. Reflection alone processes nothing: no image-map algorithm reads these attributes on anchors. Authors who copy them from old markup expect regions and get plain links.

## Use instead

A plain anchor where no map is meant:

```html
<a href="page.html">text</a>
```

An image map where one is meant, with the attributes on `area`:

```html
<img src="shapes.png" usemap="#shapes" alt="Four shapes">
<map name="shapes">
  <area shape="rect" coords="25,25,125,125" href="red.html" alt="Red box">
</map>
```

MDN documents the same shape with runnable map examples: `shape` selects the region kind and `coords` gives its geometry in CSS pixels.

## Detectability

Complete detection of the image-map attributes. The rule matches `a[coords]`, or `a[shape]` with one of the values HTML's image maps recognise: `rect`, `rectangle`, `circle`, `circ`, `poly`, `polygon` and `default`, in any ASCII case. A `shape` with any other value, such as a design system's `shape="button"` that the page's CSS selects, is an author's hook that shares the name, not a leftover image map, and stays quiet. The bare `[shape]` in each value branch is what the autofix reads: it removes every attribute the selector tests with a bare `[attr]` that is present on the element (`coords`, `shape`), and leaves every other attribute as written.

## Resources

- [WHATWG: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html): `coords` and `shape` on `a` elements are obsolete with one direction: use `area` instead of `a` for image maps.
- [MDN: `<area>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/area): documents `coords`, `shape`, `href` and `alt` on `area` with runnable map examples.
- [WHATWG: The `area` element](https://html.spec.whatwg.org/multipage/image-maps.html): `area` represents a hyperlink with a region on an image map, and `shape` plus `coords` specify the region.
