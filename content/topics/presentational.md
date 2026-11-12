---
description: "Styling written as HTML attributes and elements, align, bgcolor, font, center and the rest, and why deadhead never deletes them for you."
---

Before CSS, HTML was also the styling language. Colours went on `<body bgcolor>`, layout in
`<table width cellpadding>`, alignment in `align` on almost anything, and text was styled
with `<font>`, `<center>`, `<big>`, `<nobr>` and `<spacer>`. The HTML Standard lists all of
it as
[obsolete](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features),
with the same instruction each time: use CSS.

Most of it still works. Browsers map presentational attributes to
[presentational hints](https://html.spec.whatwg.org/multipage/rendering.html#presentational-hints),
the weakest styles on the page, which any CSS rule for the same property overrides. That is
why none of these rules has an autofix: deleting `bgcolor` or `<center>` changes how the page
looks until the CSS that replaces it exists. Some of it no longer works at all. `<blink>`,
`<spacer>`, `<multicol>` and `<basefont>` do nothing in current browsers. And two elements
are accessibility problems: `<marquee>` still scrolls, and moving text with no way to pause
it fails WCAG 2.2.2, the criterion that also rules out recreating `<blink>`.

Deadhead reports seventeen, all deprecated:

- Attributes: [`attr/body-presentational`](/rules/attr/body-presentational),
  [`attr/text-presentational`](/rules/attr/text-presentational),
  [`attr/list-presentational`](/rules/attr/list-presentational),
  [`attr/table-presentational`](/rules/attr/table-presentational),
  [`attr/table-part-presentational`](/rules/attr/table-part-presentational),
  [`attr/media-presentational`](/rules/attr/media-presentational),
  [`attr/iframe-presentational`](/rules/attr/iframe-presentational) and
  [`attr/input-presentational`](/rules/attr/input-presentational).
- Elements that still style text: [`element/font`](/rules/element/font),
  [`element/center`](/rules/element/center), [`element/big`](/rules/element/big),
  [`element/nobr`](/rules/element/nobr) and [`element/marquee`](/rules/element/marquee).
- Elements that do nothing now: [`element/blink`](/rules/element/blink),
  [`element/spacer`](/rules/element/spacer), [`element/multicol`](/rules/element/multicol)
  and [`element/basefont`](/rules/element/basefont).

Email templates, WYSIWYG editors and text pasted from word processors are where most of this
comes from today.
