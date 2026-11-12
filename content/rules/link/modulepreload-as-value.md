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

`modulepreload` does more than `preload`. MDN describes it as a way "to preemptively fetch a
module script, parse and compile it, and store it in the document's module map for later
execution". A later `<script type="module">` or `import()` of the same URL finds the module
ready. `as` names the kind of module: left off, it defaults to `script`. Every major engine has
supported the link type since 2023, when Firefox 115 and Safari 17 joined Chrome.

## Why avoid

The HTML Standard: "A module preload destination is "json", "style", "text", or a script-like
destination." For any other destination it fires `error` at the link "and return[s]". MDN says
the same. A probe on 2026-10-01 matched the spec for `font`, `image`, `fetch` and `document` in
Chromium 153 and Firefox 159; Chromium still fetched the file, Firefox did not.

The mistake comes from carrying `preload` habits over. `rel="preload"` needs `as` and accepts
every destination, so `as="font"` or `as="fetch"` is right there; on `modulepreload` the same
value disables the link. The module the author meant to warm up never reaches the module map, so
the module script or `import()` that needs it starts its own fetch, and the module's own imports
are discovered after that. The page still works, which is why the error survives: nothing
reports the `error` event unless a script listens for it.

The link cannot serve as a general preload either. The standard places the result in the module
map, where only module imports read it, and a font or image is no module. A preload for
non-module files belongs to `rel="preload"`.

## Use instead

Leave `as` off for JavaScript modules, the one form every engine accepts, and list each module
of the critical path in its own link. Preload other files with `rel="preload"`:

```html
<!-- Before: both links fire error -->
<link rel="modulepreload" href="/app.mjs" as="fetch">
<link rel="modulepreload" href="/fonts/inter.woff2" as="font" crossorigin>

<!-- After -->
<link rel="modulepreload" href="/app.mjs">
<link rel="modulepreload" href="/vendor/lit.mjs">
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

List the dependencies as well. The standard lets a browser fetch a module's imports on its own,
as an optimisation, and MDN notes that the only way to have every browser preload them is "to
individually specify them". Build tools do this: Vite "automatically generates
`<link rel="modulepreload">` directives for entry chunks and their direct imports in the built
HTML", with no `as`. A hand-written or templated link that adds `as` is the one to check.

## Detectability

The logic in `packages/rules/logic/link/modulepreload-as-value.ts` reports an `as` that names a
fetch destination outside the module set. The CLI, the bookmarklet and the ESLint plugin report
the same findings, and none skips. `script`, the worker and worklet destinations, `json`,
`style` and `text` pass; so does a value that is no destination at all, which the spec reads as
`script`. `as` is an enumerated attribute, so `as="Font"` reports like `as="font"`. A
`modulepreload` with no `as` stays quiet. There is no autofix: dropping `as` changes what the
link fetches.

## Resources

- [HTML Standard: modulepreload](https://html.spec.whatwg.org/multipage/links.html#link-type-modulepreload): module preload destinations, the `"script"` default, the `error` event, the module map, and the optional fetch of dependencies.
- [MDN: rel=modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload): the allowed values, the `error` for any other, and listing each dependency.
- [MDN browser-compat-data: `html.elements.link.rel.modulepreload`](https://github.com/mdn/browser-compat-data/blob/main/html/elements/link.json): Chrome 66, Firefox 115, Safari 17.
- [Vite: features, preload directives generation](https://vite.dev/guide/features.html#preload-directives-generation): modulepreload links for entry chunks and their direct imports.
