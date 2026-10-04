---
ruleId: "attr/style-type"
title: "<style type=\"text/css\">"
description: "type on style is obsolete; omit it for CSS and use script for data blocks."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: "style[type]"
match: "logic"
fix: { op: "remove-attribute", attr: "type" }
replacement: "Delete the attribute: <style>p { color: red; }</style>. For data blocks use script: <script type=\"application/json\">."
tags: ["defaults"]
impacts: ["maintainability"]
related: ["attr/script-type-javascript"]
---

`type` on `style` selects nothing. WHATWG lists the attribute as obsolete with a split replacement, omission for CSS and `script` for data blocks, since CSS is the sole style language and the label restates the default.

## Why avoid

WHATWG lists it as obsolete with a split replacement. Section 16.1 says authors should not specify `type` on `style`: where the attribute is present its value must be an ASCII case-insensitive match for `text/css`. Section 16.2 names `type` on `style` as obsolete with the split direction: omit the attribute for CSS; for data blocks use `script` as the container in place of `style`. The label dates from an era when the style language was in question; with CSS as the sole style language the label restates the default.

MDN says the same from the element side. Its `style` page files `type` under deprecated attributes: you should not provide it, and where you do the sole permitted values are the empty string or a case-insensitive match for `text/css`. A `type="text/css"` that restates the default and a `type="TEXT/CSS"` in upper case both ask the browser for selection it never performs: the element applies CSS with or without the label.

## Use instead

Omit the label for CSS:

```html
<style>p { color: red; }</style>
```

Use `script` for data blocks:

```html
<script type="application/json" id="state">{ "user": null }</script>
```

## Detectability

Complete detection with a logic guard. `style[type]` is a pre-filter: the verdict depends on whether lowercased text equals `text/css`, a single-value match the selector subset cannot narrow. The decision lives in `packages/rules/logic/attr/style-type.ts`.

Anything the logic does not claim stays untouched, and two exclusions are load-bearing: a type with parameters, such as `text/css; charset=utf-8`, is not a match, so the browser reads that element as a data block and never applies it. Removing the attribute would start application of CSS that never applied. The same holds for a typo like `text/cs`. Both are real bugs; neither is safe to autofix, so this rule leaves them for a human look. A `style` inside inline SVG reports too: SVG 2 still defines `type` there, and its default is CSS, so removal is as inert.

## Resources

- [WHATWG: Obsolete but conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#obsolete-but-conforming-features): authors should not specify `type` on `style`; where present it must be an ASCII case-insensitive match for `text/css`.
- [WHATWG: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `type` on `style` is obsolete: omit for CSS, `script` for data blocks.
- [MDN: `<style>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/style): `type` sits under deprecated attributes with the sole permitted values as empty string or case-insensitive `text/css`.
