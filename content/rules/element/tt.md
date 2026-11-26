---
ruleId: "element/tt"
title: "<tt>"
description: "tt is obsolete presentational markup for monospace text; use code, kbd, samp or var for what the text is, and CSS if you only want the font."
pubDate: "2026-09-14"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "tt"
fix: { op: "none" }
replacement: "Use <code> for code, <kbd> for keyboard input, <samp> for program output or <var> for a variable. If you only want a monospace font, set font-family: monospace in CSS."
tags: ["text"]
impacts: ["a11y", "maintainability"]
related: ["element/big", "element/font"]
---

`<tt>` says nothing about what its text is. `<tt>` sets its text in a monospace font.
It was a common way to mark up commands and file names. Program output came in it too,
and it still turns up in old documentation and man-page conversions.

## Why avoid

It is obsolete, and the HTML Standard says what to use instead: "Where the `tt` element would have
been used for marking up keyboard input, consider the `kbd` element; for variables, consider the
`var` element; for computer code, consider the `code` element; and for computer output, consider
the `samp` element."

All `tt` does is change the font. The spec's user-agent stylesheet gives it the same rule as three
of its replacements, `code, kbd, samp, tt { font-family: monospace; }`, and the DOM section maps it
to plain `HTMLElement`. It says how the text looks and nothing about what the text is.

The replacements do say what the text is. `code` "represents a fragment of computer code", `kbd`
"represents user input", `samp` "represents sample or quoted output from another program or
computing system", and `var` "represents a variable". That meaning is available to software as
well as readers. The HTML Accessibility API Mappings map `code` to the WAI-ARIA `code` role and
give `kbd` and `var` roles of their own, while `tt` has no mapping at all.

## Use instead

Pick the element that matches what the text is:

```html
<p>Run <code>bun run build</code>, then press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop the watcher.</p>
<p>When it finishes it prints <samp>✓ 37 rule(s) valid</samp>.</p>
<p>The area of the box is <var>w</var> × <var>h</var>.</p>
```

`code`, `kbd` and `samp` look the same as `tt` did. `var` does not: browsers render it in italics,
because the same stylesheet has `cite, dfn, em, i, var { font-style: italic; }`.

If the text is none of these and you only want the typeface, do it in CSS:

```css
.mono { font-family: monospace; }
```

## Detectability

Fully detectable by tag name. The engine never lints inside `code`, `kbd`, `samp` or
`pre`, so a
`<tt>` nested in one of them isn't reported. There is no autofix: fixes can only remove markup, not
rename it, and choosing the replacement depends on what the text means.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `tt` is obsolete; use `kbd`, `var`, `code` or `samp` according to meaning.
- [HTML Standard: Rendering: phrasing content](https://html.spec.whatwg.org/multipage/rendering.html#phrasing-content-3): `code, kbd, samp, tt { font-family: monospace; }` and `var { font-style: italic; }`.
- [HTML Standard: The code element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-code-element): with the `var`, `samp` and `kbd` sections that follow it: what each replacement means.
- [W3C: HTML Accessibility API Mappings](https://www.w3.org/TR/html-aam-1.0/#el-code): `code` maps to the ARIA `code` role, `kbd` and `var` have computed roles, and `tt` has no mapping.
