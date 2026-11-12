---
ruleId: "element/altglyph"
title: "<altGlyph> elements"
description: "SVG 2 removed altGlyph, altGlyphDef, altGlyphItem and glyphRef; Blink and Gecko ignore them, WebKit still builds them. Use a web font."
pubDate: "2026-09-23"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "altglyph, altglyphdef, altglyphitem, glyphref"
fix: { op: "none" }
replacement: "A web font with the glyph."
tags: ["svg"]
impacts: ["maintainability"]
related: ["element/font-face", "element/tref", "attr/svg-1-1-attributes"]
---

SVG 1.1's `<altGlyph>` swapped the characters of a text run for alternate glyphs, chosen through
`<altGlyphDef>`, `<altGlyphItem>` and `<glyphRef>`. SVG 2 removed all four. Blink and Gecko
treat them as unknown elements that render nothing; WebKit removed its classes for them in
October 2026, and Safari releases built before that change still draw the text.

The elements belonged to SVG fonts. An `<altGlyph>` wrapped a few characters and pointed at a
glyph, or a list of candidate glyphs, defined in an SVG font or another font, so a heading could
use a swash capital or a ligature the default glyph lacked. SVG 2 dropped SVG fonts and these
elements with them, and left glyph selection to CSS and OpenType.

## Why avoid

SVG 2 cut them. Its Changes appendix records "Removed the 'altGlyph', 'altGlyphDef',
'altGlyphItem' and 'glyphRef' elements" in the Text chapter.

The text inside disappears. Blink's list of SVG tags names none of the four, and Gecko's SVG
sources hold no class for any of them, so each is an unknown element. WebKit's commit removing
them states the result: "WebKit drew its text as a tspan. Firefox and Chrome draw nothing. SVG 2
says an element inside text that is not a text content child or an a element has display: none."
In `<altGlyph>A</altGlyph>bc`, Chrome, Edge and Firefox draw "bc".

WebKit has joined them. Its commit of 2026-10-06 removed the C++ classes and left the four tag
names in `svgtags.in` as `SVGUnknownElement`, so the HTML parser still fixes their camelCase.
Until that change reaches every Safari install, the same markup draws "Abc" in older Safari and
"bc" everywhere else.

## Use instead

Put the glyph in a web font and select it with CSS, through the font's own characters or its
OpenType features, and keep the characters as plain text:

```html
<!-- Before: the "A" vanishes in Chrome, Edge and Firefox -->
<svg viewBox="0 0 120 24" width="120" height="24">
  <text x="2" y="16"><altGlyph href="#swash">A</altGlyph>bc</text>
</svg>

<!-- After -->
<svg viewBox="0 0 120 24" width="120" height="24">
  <text x="2" y="16" style="font-family: 'Brand', sans-serif; font-feature-settings: 'swsh'">Abc</text>
</svg>
```

`font-feature-settings` and `font-variant-alternates` reach the alternates an OpenType font
carries, such as swashes and stylistic sets, and apply to SVG text as to HTML text. A glyph that
no font provides can be drawn as a `<path>` instead, with the character kept in a `<title>` or
an `aria-label` for assistive technology.

## Detectability

Detectable with the selector alone; the port lowercases tag names. The CLI, the bookmarklet and
the ESLint plugin all report; none skips.

The generated stylesheet has one gap. The HTML parser writes `altGlyph`, `altGlyphDef`,
`altGlyphItem` and `glyphRef` in camelCase, and a browser matches type selectors on SVG elements
in exact case, so `deadhead.css` cannot outline these four. The engine reports them in every
adapter.

There is no autofix. Safari versions from before WebKit's change draw the text inside an
`<altGlyph>`, so deleting the element can drop text those versions show. Move the characters
into the surrounding `<text>` and the glyph into a web font first, then delete the elements by
hand.

## Resources

- [SVG 2 Appendix K: Changes from SVG 1.1, Text](https://www.w3.org/TR/SVG2/changes.html#text): W3C Candidate Recommendation, 2018-10-04; "Removed the 'altGlyph', 'altGlyphDef', 'altGlyphItem' and 'glyphRef' elements".
- [WebKit commit c12ba4857b: Remove `*Glyph*` support](https://github.com/WebKit/WebKit/commit/c12ba4857b): 2026-10-06, the classes removed; "WebKit drew its text as a tspan. Firefox and Chrome draw nothing."
- [WebKit: svgtags.in](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/svg/svgtags.in): all four now listed with `interfaceName=SVGUnknownElement`.
- [Chromium: svg_tag_names.json5](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/svg/svg_tag_names.json5): Blink's SVG element list, without any of the four.
- [Firefox: dom/svg](https://searchfox.org/mozilla-central/source/dom/svg): Gecko's SVG element classes, with none of the four.
- [MDN: `font-variant-alternates`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variant-alternates): selecting swashes, stylistic sets and other alternate glyphs of an OpenType font.
