---
ruleId: "element/tref"
title: "<tref>"
description: "SVG 2 removed tref, which drew text copied from another element; Blink and Gecko draw nothing for it, WebKit still builds it."
pubDate: "2026-09-23"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "tref"
fix: { op: "none" }
replacement: "Put the text in the <text> element."
tags: ["svg"]
impacts: ["maintainability"]
related: ["element/altglyph", "element/font-face", "attr/svg-xlink"]
---

SVG 1.1's `<tref>` drew, inside a `<text>`, the characters of another element it referenced by
URL. SVG 2 removed it. Blink and Gecko render nothing for it, so the referenced text never
appears there; WebKit still carries a class for it.

SVG 1.1 described the idea in one sentence: "The textual content for a 'text' can be either
character data directly embedded within the 'text' element or the character data content of a
referenced element, where the referencing is specified with a 'tref' element." It let one
string, defined once in `<defs>`, appear in several labels.

## Why avoid

SVG 2 cut it. Its Changes appendix records "Removed the 'tref' element." in the Text chapter.

The engines split. Blink's list of SVG tags does not name `tref`, so it is an unknown element
that renders nothing. Gecko's SVG sources hold no class for it. WebKit's `svgtags.in` still
lists it with `interfaceName=SVGTRefElement`, exposed to scripts as plain `SVGElement` and
backed by a C++ class. A label built with `<tref>` can draw in Safari and vanish in Chrome, Edge
and Firefox, so a page tested in Safari shows text that visitors on the other engines never see.

WebKit has started to close that gap elsewhere. On 2026-10-06 it turned `altGlyph` and its
relatives, the other SVG 1.1 text elements SVG 2 dropped, into unknown elements. `tref` was not
part of that change, and WebKit still draws it.

## Use instead

Put the text in the text element itself:

```html
<!-- Before: the label draws in Safari alone -->
<svg viewBox="0 0 120 24" width="120" height="24">
  <defs>
    <text id="label">Label</text>
  </defs>
  <text x="2" y="16"><tref href="#label"></tref></text>
</svg>

<!-- After -->
<svg viewBox="0 0 120 24" width="120" height="24">
  <text x="2" y="16">Label</text>
</svg>
```

Where one string has to appear in several places, reuse the whole text element with `<use>`,
which every engine supports: define `<text id="label">Label</text>` in `<defs>` and draw it with
`<use href="#label" x="2" y="16"/>`. For text that comes from data, write it in at build time or
from script, so the characters sit in the drawing where every engine reads them.

## Detectability

Detectable with the selector alone; the port lowercases tag names. The CLI, the bookmarklet and
the ESLint plugin all report; none skips.

There is no autofix. WebKit still builds `SVGTRefElement`, so deleting a `<tref>` can drop text
that Safari draws. Copy the text into the `<text>` element first, then delete the `<tref>` by
hand.

## Resources

- [SVG 2 Appendix K: Changes from SVG 1.1, Text](https://www.w3.org/TR/SVG2/changes.html#text): W3C Candidate Recommendation, 2018-10-04; "Removed the 'tref' element."
- [SVG 1.1 (Second Edition) §10.6: The 'tref' element](https://www.w3.org/TR/SVG11/text.html#TRefElement): text content taken from "the character data content of a referenced element".
- [Chromium: svg_tag_names.json5](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/svg/svg_tag_names.json5): Blink's SVG element list, without `tref`.
- [WebKit: svgtags.in](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/svg/svgtags.in): `tref` with `interfaceName=SVGTRefElement`.
- [WebKit commit c12ba4857b: Remove `*Glyph*` support](https://github.com/WebKit/WebKit/commit/c12ba4857b): `altGlyph` and its relatives became unknown elements in October 2026; `tref` was not part of it.
- [Firefox: dom/svg](https://searchfox.org/mozilla-central/source/dom/svg): Gecko's SVG element classes, without one for `tref`.
- [MDN: `<use>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use): duplicates a referenced element, `<text>` included.
