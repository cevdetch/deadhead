---
ruleId: "meta/supported-color-schemes"
title: "<meta name=\"supported-color-schemes\">"
description: "The pre-standard name of color-scheme. Chrome and Firefox ignore it, so a dark page keeps light form controls and scrollbars there."
pubDate: "2026-09-29"
status: "avoid"
severity: "harmful"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="supported-color-schemes" i]'
match: "logic"
fix: { op: "remove-element" }
replacement: "Rename it: <meta name=\"color-scheme\" content=\"light dark\">. Delete the old tag once a color-scheme meta carries the same keywords."
tags: ["theming"]
impacts: ["interop"]
related: ["meta/color-scheme-value", "meta/theme-color-value"]
---

`<meta name="supported-color-schemes">` is the first name of what became
`<meta name="color-scheme">`. The CSS Working Group renamed it in 2019, and HTML reads the new
name alone. Chrome and Firefox ignore the old one, so a page that declares its schemes this
way declares none there.

## Why avoid

The name comes from Rune Lillesveen's 2019 `supported-color-schemes` draft, which defined a
CSS property of that name. On 2019-04-17 the CSS Working Group resolved to "Add the
color-scheme property and meta with updated grammar and no 'only' property to Color Adjust
spec instead of supported-color-scheme". The Color Adjust draft of the next day carried
`color-scheme` alone. HTML's steps match metas whose name "is an ASCII case-insensitive match
for color-scheme".

Chrome and Firefox read `color-scheme` and nothing else. Blink's meta handling has no branch
for the old name, and Firefox's source mentions it in one web-platform test. In Chromium 153
and Firefox 159, `<meta name="supported-color-schemes" content="dark">` leaves the system
colors light, while the same content under `color-scheme` turns them dark. A dark design
declared this way keeps light form controls, light scrollbars and a white first paint.

## Use instead

```html
<meta name="color-scheme" content="light dark">
```

Rename the tag and keep its content. Delete the old tag once the new one carries the same
keywords.

## Detectability

Detectable with a selector. The CLI, the bookmarklet and the ESLint plugin report the same
findings; none skips. The selector `meta[name="supported-color-schemes" i]` decides every
finding.

The autofix removes the element when the same `<head>` holds a `<meta name="color-scheme">`
with the same keywords, compared after splitting on ASCII whitespace and folding ASCII case.
That tag has nothing left to add. Every other finding carries no fix: the repair is a rename,
which no fix op performs. A `color-scheme` meta with different keywords also blocks the fix,
since the two tags disagree and the author has to settle which one stands.

## Resources

- [CSSWG issue #3807, minutes of 2019-04-17](https://github.com/w3c/csswg-drafts/issues/3807#issuecomment-484176211): "Proposal is to rename supported-color-scheme to color-scheme", and "resolved: Add the color-scheme property and meta with updated grammar and no 'only' property to Color Adjust spec instead of supported-color-scheme".
- [csswg-drafts commit a647cfd (2019-04-18)](https://github.com/w3c/csswg-drafts/commit/a647cfd6a87646c4ef2238204ba9c996e7faf0b0): the first Color Adjust draft, which "Pulled 'color-scheme' from Rune's draft https://lilles.github.io/specs/supported-color-schemes.html".
- [HTML Standard: `<meta name="color-scheme">`](https://html.spec.whatwg.org/multipage/semantics.html#meta-color-scheme): the candidate metas are those whose name "is an ASCII case-insensitive match for color-scheme".
- [Chromium: `html_meta_element.cc`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/html_meta_element.cc): the meta dispatch matches `keywords::kColorScheme` and has no branch for `supported-color-schemes`.
