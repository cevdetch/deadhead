---
ruleId: "attr/input-ismap-usemap"
title: "<input ismap, usemap>"
description: "ismap and usemap do nothing on inputs; image buttons already map server-side and img covers client maps."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "input[ismap], input[usemap]"
fix: { op: "remove-attributes" }
replacement: "Delete the attributes. For a server-side map keep <input type=\"image\" src=\"go.png\" alt=\"Go\">; for a client-side map use img with usemap."
tags: ["forms", "media"]
impacts: ["maintainability"]
related: ["attr/object-usemap"]
---

`ismap` and `usemap` do nothing on `input`. The HTML Standard calls `ismap` a restatement of the
image button's default and sends `usemap` to `img`, so the pair is dead weight on every image
button that carries it.

Both come from HTML 4.01, whose DTD gave `INPUT` the same map attributes as `IMG`: `usemap` for
a client-side map and `ismap` to "use server-side image map". On `<input type="image">` the
server-side behaviour was already built in, and HTML5 kept only that.

## Why avoid

The HTML Standard's list of non-conforming features names `ismap` on `input` elements:
"Unnecessary. Omit it altogether. All input elements with a type attribute in the Image Button
state are processed as server-side image maps." An image button submits the click position as
two fields, `name.x` and `name.y`, with or without the attribute.

It names `usemap` on `input` together with `usemap` on `object`: "Use the img element for image
maps." The image map processing model covers `img` alone, and a `useMap` IDL attribute remains
on `HTMLInputElement` only for script. In a probe on 2026-11-12, Chrome 156 hit-tested the
`<area>` of a map attached to an `<img>` and the `<input>` itself for a map attached to an image
button: the areas were not there to click. Mozilla bug 392994, "Remove support for
`<input usemap>` and `<object usemap>`", is still open, so Firefox's behaviour is less settled.
A form that relies on the map's areas works in one engine at most.

## Use instead

A server-side image button needs no hint; read the coordinates from the submitted fields:

```html
<!-- Before -->
<input type="image" src="go.png" alt="Go" ismap>

<!-- After: submits go.x and go.y -->
<input type="image" name="go" src="go.png" alt="Go">
```

A set of clickable regions belongs on `img`, with each region as a link or a button of its own:

```html
<img src="shapes.png" usemap="#shapes" alt="Shapes">
<map name="shapes">
  <area shape="rect" coords="25,25,125,125" href="red.html" alt="Red box">
</map>
```

When the regions should submit a form, separate buttons, one per choice, give each choice a
label that keyboard and screen-reader users can reach, which coordinates do not.

## Detectability

Detectable with one selector: `input[ismap]` or `input[usemap]`. Presence of either attribute is
the whole verdict, so no logic module exists. The CLI, the bookmarklet and the ESLint plugin
report the same findings, and none skips. The autofix removes every attribute the rule names
that is present on the element, and leaves every other attribute as written. `ismap` and
`usemap` on `img` stay live and never match.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `ismap` on `input`, "All input elements with a type attribute in the Image Button state are processed as server-side image maps"; `usemap` on `input`, "Use the img element for image maps."
- [HTML Standard: image maps](https://html.spec.whatwg.org/multipage/image-maps.html#image-map-processing-model): the processing model applies to `img` elements with `usemap`.
- [HTML 4.01: strict DTD](https://www.w3.org/TR/html401/sgml/dtd.html): `usemap` and `ismap` on `INPUT`, "use server-side image map".
- [Mozilla bug 392994](https://bugzilla.mozilla.org/show_bug.cgi?id=392994): "Remove support for `<input usemap>` and `<object usemap>`", open.
