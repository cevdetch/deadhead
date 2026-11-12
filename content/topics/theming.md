---
description: "theme-color and color-scheme, the meta tags that colour the browser's own interface, and the malformed values that make HTML skip them."
---

Two `<meta>` names colour things a stylesheet cannot reach.
[`theme-color`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/theme-color)
gives the browser a colour for its own interface: the tab strip, the address bar, the title
bar of an installed app.
[`color-scheme`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/color-scheme)
says which colour schemes the page supports before any CSS loads, so a dark page gets a dark
first paint, dark scrollbars and dark form controls.

Both are read by parsing `content` as CSS, and the HTML Standard tells the browser to skip an
element whose value fails to parse. Nothing reports the failure. The interface keeps its
default colour, or the page declares no scheme. With a light and a dark `theme-color` behind
`media` queries, one bad value breaks one mode only, and an author who tests in the other
never sees it.

Deadhead reports three ways to lose the colour, all harmful:

- [`meta/theme-color-value`](/rules/meta/theme-color-value): content that is not a CSS
  colour, such as `ff0000` without its `#`, a five-digit hex, or `var(--brand)`, which a meta
  tag has no custom properties to resolve.
- [`meta/color-scheme-value`](/rules/meta/color-scheme-value): content outside the
  `color-scheme` grammar, such as `light, dark` with a comma, or `normal` next to another
  keyword.
- [`meta/supported-color-schemes`](/rules/meta/supported-color-schemes): the draft name the
  CSS Working Group renamed to `color-scheme` in 2019. Chrome and Firefox ignore it.

The two value rules have no autofix, because the repair is a corrected value and deleting the
tag would drop the declaration. The old name is deleted only when a `color-scheme` tag with
the same keywords already stands beside it.

Apple's [`apple-mobile-web-app-status-bar-style`](/rules/meta/apple-mobile-web-app-status-bar-style)
styles a different surface, the status bar of a home-screen app, and is listed under
[Apple](/topics/apple).
