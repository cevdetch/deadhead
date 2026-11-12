---
ruleId: "element/multicol"
title: "<multicol>"
description: "No browser lays out multicol; use CSS multi-column layout instead."
pubDate: "2026-09-14"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: 'multicol'
fix: { op: "none" }
replacement: "Lay out columns with CSS: `columns: 2` on a normal container."
tags: ["presentational"]
impacts: ["maintainability"]
related: ["element/center", "element/spacer"]
---

No browser lays out `<multicol>`. It was Netscape's element for newspaper-style columns: `cols`
said how many, `gutter` the space between them in pixels, and `width`, by Netscape's
description, the width of each. The HTML Standard lists it under non-conforming features with
the direction "Use appropriate elements or CSS instead".

Netscape Navigator supported it from the 3.0 betas to 4.x, according to Index DOT Html, which
also records that it "is not a part of any HTML standard or draft". Pages that used it rendered
as single-column text in every other browser.

## Why avoid

It is entirely obsolete and must not be used by authors. The HTML Standard maps `multicol` to
`HTMLUnknownElement`, the interface for names it does not define, so no engine lays out columns
from it. The archived MDN page records that the experiment "never got any significant traction
and is not implemented in any major browsers", and that Firefox up to version 22 exposed it as
`HTMLSpanElement` before switching to `HTMLUnknownElement` as the specification asked.

Markup that does nothing in every browser is dead weight that misleads the next reader into
thinking the columns come from the tag. As an unknown element, `<multicol>` renders inline by
default, so its `<p>` children still break into blocks, in one column.

CSS owns this job now. CSS Multi-column Layout flows any element's content into balanced
columns: `column-count` fixes the number of columns, `column-width` sets their optimal width,
and `columns` is the shorthand for both, with `column-gap` and `column-rule` controlling the
gutters. That is everything `multicol` promised, on every engine, without a proprietary tag.

## Use instead

A normal container, with the columns declared in CSS. The three attributes map onto CSS
properties:

```html
<!-- Before -->
<multicol cols="2" gutter="16">
  <p>First column text…</p>
  <p>Second column text…</p>
</multicol>

<!-- After -->
<div class="cols">
  <p>First column text…</p>
  <p>Second column text…</p>
</div>
```

```css
.cols { column-count: 2; column-gap: 16px; }
```

Netscape documented `width` as the width of one column, while Index DOT Html found that it set
the width of the whole layout in practice. Check which one the old page relied on: a column
width becomes `column-width`, a total width becomes `width` on the container. CSS treats
`column-width` as a minimum, fitting as many columns of at least that width as the container
allows, up to `column-count`, so the CSS version adapts to the screen where the tag was fixed.
`break-inside: avoid` on the children keeps a paragraph or a figure from splitting across two
columns.

## Detectability

Detectable with the selector alone. The rule matches the bare element name `multicol`; no logic
module is needed. The CLI, the bookmarklet and the ESLint plugin report the same findings, and
none skips, and all three agree on closed elements.

There is no autofix. Removing the element deletes its content, and rewriting it as a styled
container is not a subtraction, so the fix op is `none`.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `multicol` is entirely obsolete; appropriate elements or CSS instead.
- [HTML Standard: elements in the DOM](https://html.spec.whatwg.org/multipage/dom.html#elements-in-the-dom): `multicol` is among the names that return `HTMLUnknownElement`.
- [Index DOT Html: MULTICOL](https://hepunx.rl.ac.uk/~adye/blooberry/indexdot/html/tagpages/m/multicol.htm): the `cols`, `gutter` and `width` attributes, support in Netscape from 3.0 beta 5 to 4.x, and the note that `width` set the total width in practice.
- [W3C CSS Multi-column Layout Module Level 1](https://www.w3.org/TR/css-multicol-1/): `column-count`, `column-width` and the `columns` shorthand, `column-gap` and `column-rule`.
- [MDN: `<multicol>` (archive mirror)](https://devdoc.net/web/developer.mozilla.org/en-US/docs/Web/HTML/Element/multicol.html): "never got any significant traction and is not implemented in any major browsers"; `HTMLSpanElement` in Firefox up to version 22 (MDN has since removed the page).
