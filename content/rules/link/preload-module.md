---
ruleId: "link/preload-module"
title: "<link rel=\"preload\" as=\"script\"> for a module script"
description: "A preload as=script that points at a module script fetches twice; use modulepreload instead."
pubDate: "2026-09-28"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "head"
match: "logic"
fix: { op: "none" }
replacement: "Swap the rel token to modulepreload and keep the same href: <link rel=\"modulepreload\" href=\"/app.js\">. Do not add crossorigin to the preload instead."
tags: ["resource-hints", "scripting"]
impacts: ["performance"]
related: ["link/preload-as-missing", "link/preload-font-crossorigin-missing", "link/preload-fetch-crossorigin-missing"]
---

A `preload as=script` for a module script downloads the file twice. The preload
and the module fetch disagree on credentials mode, so the second request misses
the cache.

## Why avoid

Module scripts always fetch in `cors` mode. A `preload as=script` with no
`crossorigin` fetches in `no-cors` mode, and a preloaded response is reused when
URL, destination, request mode and credentials mode each match the later request.
With mismatched modes the browser sends a second request for bytes it already
holds. Web.dev states the outcome: "otherwise you end up fetching the resource
twice."

The maintainer measured the pair in headless Chromium and Firefox across cache
modes. With `no-store` the page sends two downloads. With `no-cache` it sends a
download plus a 304 revalidation. Adding `crossorigin` to the preload cuts
Chromium to one request, while Firefox still sends two.

With `max-age` both browsers reuse the preloaded bytes, hiding the network cost,
yet the parse and compile wait remains: `preload` stores bytes in the cache,
while `modulepreload` parses and compiles the module into the module map ahead
of execution.

## Use instead

Swap the `rel` token to `modulepreload` and keep the same `href`:

```html
<link rel="modulepreload" href="/app.js">
<script type="module" src="/app.js"></script>
```

Do not add `crossorigin` to the preload and keep it: Firefox fetches twice with
or without it, so the attribute changes nothing for this pair.

## Detectability

Detectable in full from markup alone: the rule collects every module `script
src` in the document, then reports each `preload as=script` whose `href` matches
one `src` as a string after trimming ASCII whitespace.

Letter case in `rel`, `as` and `type` is ignored, and `crossorigin` changes
nothing: the finding stands with or without it. A preload with no `href`, a
module script with no `src` and a classic script never match. No source offsets
are read, so the CLI, the bookmarklet and the ESLint plugin agree outright.

## Resources

- [HTML Standard: link type "modulepreload"](https://html.spec.whatwg.org/multipage/links.html#link-type-modulepreload): "must preemptively fetch the module script and store it in the document's module map for later evaluation".
- [MDN: rel="modulepreload"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload): fetch mode is always `cors`; `preload` caches bytes while `modulepreload` compiles into the module map.
- [Preload modules on web.dev](https://web.dev/articles/modulepreload): credentials modes must match for a cache hit, "otherwise you end up fetching the resource twice".
- [MDN: rel="preload"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload): "Use `<link rel="modulepreload">` instead if you are working with JavaScript modules."
