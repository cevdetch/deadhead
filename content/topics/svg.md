---
description: "SVG 1.1 attributes and elements that SVG 2 removed or deprecated, as they arrive in HTML with icons pasted inline from design tools."
---

Most SVG in HTML arrives as an icon or illustration exported from a design tool and pasted
inline. The exports carry SVG 1.1 habits: `version="1.1"` and `baseProfile` on the root,
`xlink:href` for links and references, `xml:space="preserve"` on text, and
`enable-background` from a filter feature no current engine built. Some files also carry
whole SVG 1.1 features, such as SVG fonts, `<altGlyph>` and `<tref>`.

[SVG 2](https://www.w3.org/TR/SVG2/) removed or deprecated all of these. Most are inert:
nothing renders differently without `version`, `baseProfile` or `enable-background`, so the
fix deletes them. The elements are different. Blink and Gecko ignore SVG fonts, `<altGlyph>`
and `<tref>`, but WebKit still builds some of them, so the same drawing can render
differently in Safari. And `xml:space` and `xlink:href` still work in every browser, so they
need their replacement written first: CSS `white-space` for the first, a plain `href` for the
second.

Deadhead reports eleven, all deprecated:

- [`attr/svg-version`](/rules/attr/svg-version),
  [`attr/svg-baseprofile`](/rules/attr/svg-baseprofile) and
  [`attr/svg-enable-background`](/rules/attr/svg-enable-background): deleted by the fix.
- [`attr/svg-1-1-attributes`](/rules/attr/svg-1-1-attributes): seven more attributes SVG 2
  removed.
- [`attr/svg-xlink`](/rules/attr/svg-xlink) and [`attr/svg-xml-space`](/rules/attr/svg-xml-space):
  write `href`, a child `<title>` and CSS before deleting.
- [`element/font-face`](/rules/element/font-face),
  [`element/altglyph`](/rules/element/altglyph), [`element/tref`](/rules/element/tref),
  [`element/cursor`](/rules/element/cursor) and
  [`element/solidcolor`](/rules/element/solidcolor): removed elements. Use a web font, real
  text, CSS `cursor: url(…)` and a CSS custom property instead.
