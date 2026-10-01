---
ruleId: "link/modulepreload-as-value"
title: "<link rel=\"modulepreload\"> with a non-module as"
description: "A modulepreload whose as names a non-module destination fires error and preloads nothing; Chromium still downloads the file."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: 'link[rel~="modulepreload" i][as]'
match: "logic"
fix: { op: "none" }
replacement: "Drop as for JavaScript modules, which defaults to script: <link rel=\"modulepreload\" href=\"/app.mjs\">. Preload other files with rel=\"preload\"."
tags: ["resource-hints"]
impacts: ["performance"]
related: ["link/preload-module", "link/preload-as-missing"]
---

A `<link rel="modulepreload">` whose `as` names a destination outside the module set, such as
`font`, `image` or `fetch`, preloads nothing. The browser fires `error` at the link and stops.
Chromium downloads the file anyway, so the bytes are spent for nothing.

## Why avoid

The HTML Standard: "A module preload destination is "json", "style", "text", or a script-like
destination." For any other destination it fires `error` at the link "and return[s]". MDN says
the same. A probe on 2026-10-01 matched the spec for `font`, `image`, `fetch` and `document` in
Chromium 153 and Firefox 159; Chromium still fetched the file, Firefox did not.

## Use instead

Leave `as` off for JavaScript modules, the one form every engine accepts, and list each module
of the critical path in its own link. Preload other files with `rel="preload"`:

```html
<link rel="modulepreload" href="/app.mjs">
<link rel="modulepreload" href="/vendor/lit.mjs">
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

## Detectability

The logic in `packages/rules/logic/link/modulepreload-as-value.ts` reports an `as` that names a
fetch destination outside the module set. `script`, the worker and worklet destinations, `json`,
`style` and `text` pass; so does a value that is no destination at all, which the spec reads
as `script`. There is no autofix: dropping `as` changes what the link fetches.

## Resources

- [HTML Standard: modulepreload](https://html.spec.whatwg.org/multipage/links.html#link-type-modulepreload): module preload destinations, the `"script"` default, and the `error` event.
- [MDN: rel=modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload): the allowed values, the `error` for any other, and listing each dependency.
