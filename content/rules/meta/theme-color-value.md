---
ruleId: "meta/theme-color-value"
title: "<meta name=\"theme-color\"> with a malformed color"
description: "HTML skips a theme-color meta whose content is not a CSS color, such as ff0000 without #. The browser keeps its default UI color."
pubDate: "2026-09-29"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="theme-color" i][content]'
match: "logic"
fix: { op: "none" }
replacement: "Write a CSS color: <meta name=\"theme-color\" content=\"#ff0000\">, a named color or rgb(). Hex needs its #; var() does not work here."
tags: ["theming"]
impacts: ["interop"]
related: ["meta/color-scheme-value", "meta/viewport-value"]
---

`<meta name="theme-color">` hands the browser a color for its own interface: the tab strip,
the address bar, the title bar of an installed app. HTML parses `content` as a CSS color and
skips the element when the parse fails. The interface keeps its default, and the page shows
no sign of the failure.

## Why avoid

HTML takes the theme color from the first matching `<meta name="theme-color">` whose content
parses: "Let color be the result of parsing value. If color is not failure, then return
color." CSS Color 4 defines that parse for "HTML attributes or Canvas interfaces". The string
must match the `<color>` grammar on its own, with no cascade behind it.

The failures follow habits from other tools. `ff0000` drops the `#` that design tools leave
off. `#12345` has five digits. `var(--brand)` works in a stylesheet, and the meta has no
custom properties to substitute; `inherit` is a cascade keyword with nothing to inherit from.
With a `media` pair for light and dark, one malformed value leaves that mode uncolored while
the other works, so an author testing in one mode misses it.

## Use instead

```html
<meta name="theme-color" content="#1a73e8">
<meta name="theme-color" content="#0b1a2e" media="(prefers-color-scheme: dark)">
```

Any CSS color works: hex with its `#`, a named color, `rgb()`, `hsl()`, `oklch()`. Write the
value itself, not a custom property.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings; none skips. The selector prefilters to
`meta[name="theme-color" i][content]`: HTML ignores the element without `content`. The
module in `packages/rules/logic/meta/theme-color-value.ts` strips ASCII whitespace and CSS
comments, ignores ASCII case, and accepts three shapes:

- a hex color: `#` and 3, 4, 6 or 8 hex digits
- a word, taken as one of the color names CSS Color 4 lists
- a color function with arguments and nothing after its closing parenthesis: `rgb`, `rgba`,
  `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color`, `color-mix`, `light-dark`,
  `contrast-color`

Everything else reports: an empty value, a hex color missing its `#` (`ff0000`), a bad hex
length or digit (`#12345`, `#ggg`), `inherit` and the other CSS-wide keywords, `none`,
`var(--brand)`, `calc(1)`, `rgb()` and `rgb(0 0 0) red`. A missing final `)` stays quiet,
since CSS closes a function left open at the end of the input.

The rule has two blind spots. It carries no list of the 192 color names, so a misspelt name
such as `blu` passes: the list would cost the bookmarklet 2.2 kB, and hex and functions, the
forms the rule checks in full, cover every color. It does not check the arguments of a color
function, so `rgb(300 0)` passes here and fails in the browser. No color name is spelled with
hex digits alone, so `ff0000`, `fff` and `cafe` report as hex colors missing their `#`.

The autofix is `none`: the repair corrects the color, and deleting the element drops it.

## Resources

- [HTML Standard: `<meta name="theme-color">`](https://html.spec.whatwg.org/multipage/semantics.html#meta-theme-color): "The value must be a string that matches the CSS <color> production", and the steps that strip ASCII whitespace, then "Let color be the result of parsing value. If color is not failure, then return color."
- [CSS Color Module Level 4: parse a CSS `<color>` value](https://drafts.csswg.org/css-color-4/#parse-a-css-color-value): "Parse input as a <color>. If the result is failure, return failure", for use "in other places like HTML attributes or Canvas interfaces", plus the named, system and deprecated color lists.
- [MDN: `<meta name="theme-color">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/theme-color): the theme color is set "using a content attribute in the `<meta>` element as a CSS <color> value", with `media` for light and dark pairs.
