---
ruleId: "meta/color-scheme-value"
title: "<meta name=\"color-scheme\"> with a malformed value"
description: "HTML skips a color-scheme meta whose value breaks the CSS grammar, such as light, dark. Unless a later one parses, no scheme applies."
pubDate: "2026-09-29"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="color-scheme" i][content]'
match: "logic"
fix: { op: "none" }
replacement: "Separate keywords with spaces, no commas: <meta name=\"color-scheme\" content=\"light dark\">. Put only first or last: only light."
impacts: ["a11y", "interop"]
related: ["meta/viewport-value", "meta/google-value"]
---

`<meta name="color-scheme">` tells the browser which color schemes a page supports before
any CSS loads. HTML parses its `content` as a CSS `color-scheme` value and skips the element
when the parse fails. A comma, a stray `normal` or a misplaced `only` leaves the page with no
declared scheme.

## Why avoid

HTML reads the element by parsing `content` as CSS and keeping it if it "is a valid CSS
'color-scheme' property value". A value that fails sends the browser to the next
`color-scheme` meta; with none left, the page declares no scheme.

CSS Color Adjustment defines the grammar as `normal | [ light | dark | <custom-ident> ]+ &&
only?`. Spaces separate the keywords, so the comma in `light, dark` voids the whole value.
`normal` stands alone. `only` sits before or after the list of schemes, never inside it and
never alone. CSS Values bars the CSS-wide keywords and `default` from `<custom-ident>`.

The cost lands on dark-mode visitors. HTML defines the meta "To aid user agents in rendering
the page background with the desired color scheme immediately". A skipped `light dark` gives
a white first paint, then light scrollbars and form controls on a dark design. `only`
"Forbids the user agent from overriding the color scheme", so a skipped `only light` lets a
browser that darkens pages on its own override the scheme the author pinned.

MDN states that "`only dark` _is invalid_". The grammar allows `only` with either scheme, and
Chromium and Firefox both accept `only dark`, so this rule stays quiet on it.

## Use instead

```html
<meta name="color-scheme" content="light dark">
<meta name="color-scheme" content="only light">
```

Keywords take spaces, not commas. `only` goes first or last: `only light` and `light only`
do the same thing.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings; none skips. The selector prefilters to
`meta[name="color-scheme" i][content]`: HTML ignores the element without `content`. The
module in `packages/rules/logic/meta/color-scheme-value.ts` splits `content` on ASCII
whitespace, compares keywords ignoring ASCII case, and reports these values:

- an empty value
- a token that is not a CSS identifier: `light, dark`, `light,dark`, `light;dark`
- `normal` with anything else: `normal light`, `light normal`, `normal only`
- `only` with no scheme, or twice: `only`, `only only light`
- `only` between schemes: `light only dark`, `dark only light`
- a word CSS bars from `<custom-ident>`: `default`, `initial`, `inherit`, `unset`, `revert`,
  `revert-layer`

These stay quiet: `normal`, `light`, `dark`, `light dark`, `dark light`, `only light`,
`only dark`, `light only`, `dark only`, `only light dark`, `only dark light`,
`light dark only` and `dark light only`. So do a repeated keyword (`light light`), any letter
case, extra whitespace and custom identifiers (`light dark foo`), which CSS keeps for schemes
added later.

Chromium 153 accepts a CSS-wide keyword such as `inherit` as the whole value, and Firefox 159
skips it. Neither reading names a scheme, so the rule reports it. Several `color-scheme` metas
are out of scope: HTML describes a stack with newer values first and legacy values after. A
malformed value inside such a stack still reports, and the browser falls back to the next meta.

The autofix is `none`: the repair corrects the value, and deleting the element drops the
declaration.

## Resources

- [HTML Standard: `<meta name="color-scheme">`](https://html.spec.whatwg.org/multipage/semantics.html#meta-color-scheme): "The value must be a string that matches the syntax for the CSS 'color-scheme' property value", the steps that return the first candidate that "is a valid CSS 'color-scheme' property value", and the fallback note: "the multiple meta elements needs to be arranged with the legacy values after the newer values".
- [CSS Color Adjustment Module Level 1: `color-scheme`](https://drafts.csswg.org/css-color-adjust-1/#color-scheme-prop): `normal | [ light | dark | <custom-ident> ]+ && only?`, "The normal, light, dark, and only keywords are not valid <custom-ident>s in this property", and "Repeating a keyword, such as color-scheme: light light, is valid".
- [CSS Values and Units Level 4: `<custom-ident>`](https://drafts.csswg.org/css-values-4/#custom-idents): "The CSS-wide keywords are not valid <custom-ident>s. The default keyword is reserved and is also not a valid <custom-ident>."
- [MDN: `<meta name="color-scheme">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/color-scheme): the content "defines the color scheme as a CSS color-scheme value", with `normal`, `light`, `dark`, `light dark`, `dark light` and `only light` as examples.
