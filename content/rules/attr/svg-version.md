---
ruleId: "attr/svg-version"
title: "<svg version>"
description: "SVG 2 removed version from <svg>; it never influenced rendering or processing, so delete it."
pubDate: "2026-09-23"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "svg[version]"
fix: { op: "remove-attribute", attr: "version" }
replacement: "Delete the attribute: <svg viewBox=\"0 0 24 24\">."
tags: ["svg"]
impacts: ["maintainability"]
related: ["attr/svg-baseprofile", "attr/html-version", "attr/svg-xlink", "attr/xmlns-prefix"]
---

`<svg version="1.1">` states which edition of SVG the drawing conforms to. SVG 2 removed the
attribute, and it never did anything a renderer acts on. It arrives in HTML with every icon
pasted in from an editor's export.

The attribute belongs to SVG's standalone-file era. SVG 1.0 fixed it at `1.0`, SVG 1.1 asked for
`1.1`, and SVG Tiny 1.2 added `1.2`, paired with `baseProfile="tiny"` for mobile profiles.
Exports from design tools can carry `version="1.1"`, next to an XML declaration and an `xmlns`,
and that header travels into HTML when the file is pasted inline.

## Why avoid

SVG 1.1 defined `version` on `<svg>` to state "the SVG language version to which this document
fragment conforms", fixed at `1.0` in SVG 1.0 and "should have the value '1.1'" after. SVG 2
took it out: its Changes appendix lists "Removed the baseProfile and version attributes from the
'svg' element" under the Document Structure chapter. MDN states what the attribute did while it
existed: it "is purely advisory and has no influence on rendering or processing", and it "is
only allowed on the root `<svg>` element".

Inline in an HTML page, the claim is also wrong. The HTML parser builds the drawing as SVG
elements in the page's DOM, and browsers render it by their current SVG rules whatever the
attribute says. A `version="1.1"` on an icon that uses SVG 2 features, such as `href` without
`xlink:`, describes a language the drawing does not follow. Each pasted copy of the icon carries
the dead bytes again.

## Use instead

Delete the attribute, and with it the rest of the file header an inline drawing does not need:

```html
<!-- Before: pasted from an export -->
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <path d="M4 12h16"/>
</svg>

<!-- After -->
<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <path d="M4 12h16"/>
</svg>
```

In HTML the parser puts `<svg>` in the SVG namespace on its own, so the `xmlns` adds nothing
either; a standalone `.svg` file keeps its `xmlns`, which an XML parser needs. Strip the header
at the source where icons come from a build step, in the export settings or in the optimiser
that processes the files, so new icons arrive without it.

## Detectability

Detectable with the selector alone. `svg[version]` matches the root `<svg>`, where SVG 1.1 put
the attribute, and a nested one, where MDN says it was never allowed.

The fix removes the attribute. With "no influence on rendering or processing", deleting it
changes nothing a browser draws or runs. The CLI and the ESLint plugin report and fix; the
bookmarklet reports without a fix, having no source text. `baseProfile`, removed in the same
line of the Changes appendix, has its own rule so that each keeps an autofix.

## Resources

- [SVG 2 Appendix K.2.6: Document Structure chapter changes](https://www.w3.org/TR/SVG2/changes.html#structure): W3C Candidate Recommendation, 2018-10-04; "Removed the baseProfile and version attributes from the 'svg' element".
- [SVG 1.1 (Second Edition) §5.1.2: The 'svg' element](https://www.w3.org/TR/SVG11/struct.html#SVGElementVersionAttribute): `version` "Indicates the SVG language version to which this document fragment conforms"; "For SVG 1.1, the attribute should have the value '1.1'".
- [SVG Tiny 1.2: the 'svg' element](https://www.w3.org/TR/SVGTiny12/struct.html#SVGElement): `version` values "1.0", "1.1" and "1.2".
- [MDN: version](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/version): "only allowed on the root `<svg>` element", "purely advisory and has no influence on rendering or processing", and marked deprecated.
- [HTML Standard: the "in body" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody): a start tag named `svg` is inserted as a foreign element in the SVG namespace, with or without an `xmlns` attribute.
