---
ruleId: "attr/script-src"
title: "<script src> on an import map or speculation rules"
description: "Browsers never fetch an import map or speculation rules from src. They fire error and skip the inline JSON too, so nothing applies."
pubDate: "2026-09-29"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: 'script[src][type*="importmap" i], script[src][type*="speculationrules" i]'
match: "logic"
fix: { op: "none" }
replacement: "Put the JSON inline: <script type=\"importmap\">{\"imports\": {...}}</script>. For speculation rules, send a Speculation-Rules response header."
tags: ["scripting"]
impacts: ["interop", "performance"]
related: ["attr/script-nomodule", "link/preload-module"]
---

HTML defines no external form for an import map or a speculation rule set. A `src` on
either makes the browser fire `error` and skip the element, inline JSON included. An import
map written this way never applies, and every module that imports through it fails.

## Why avoid

HTML's "prepare the script element" checks `src` before it reads any content. For an import
map or a speculation rule set with the attribute, it queues an `error` event and returns.
The browser fetches nothing and ignores any JSON between the tags. A note in the standard
states it: "External import maps and speculation rules are not currently supported."
Chromium, Firefox and WebKit implement the step as written. Chromium logs "External
speculation rules are not yet supported."; Firefox logs `ImportMapExternalNotSupported` or
`SpeculationRulesExternalNotSupported`.

The import map case breaks the page:

```html
<script type="importmap" src="/importmap.json"></script>
<script type="module">import { h } from "preact";</script>
```

The map never registers, so the module throws `Failed to resolve module specifier "preact"`
and nothing that depends on it runs. The speculation rules case fails without a visible
error: the browser prefetches and prerenders nothing.

## Use instead

Write the import map inline:

```html
<script type="importmap">{"imports": {"preact": "/vendor/preact.mjs"}}</script>
```

For speculation rules, keep the JSON inline, or send the rule set's URL in a
`Speculation-Rules` response header. HTML fetches that URL and applies the file when it is
served as `application/speculationrules+json`:

```http
Speculation-Rules: "/speculationrules.json"
```

Import maps have no external route.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings; none skips. The selector prefilters with `*=`, so a padded
`type=" importmap "` reaches the module in `packages/rules/logic/attr/script-src.ts`. The
module takes the type as HTML does, with ASCII whitespace stripped, and reports an ASCII
case-insensitive match for `importmap` or `speculationrules`. `importmap-shim` from
es-module-shims fails that match and stays quiet: the shim fetches its own `src`. The value
of `src` does not matter, since HTML returns before it reads the URL.

The autofix is `none`. Deleting `src` leaves an empty element while the map stays in the
external file, and deleting the element drops inline JSON the author meant to apply. The
repair moves the JSON inline.

## Resources

- [HTML Standard: prepare the script element](https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element): "If el's type is "importmap" or "speculationrules", then queue an element task ... to fire an event named error at el, and return", and the note "External import maps and speculation rules are not currently supported".
- [HTML Standard: the `Speculation-Rules` header](https://html.spec.whatwg.org/multipage/speculative-loading.html#the-speculation-rules-header): the header "allows the developer to request that the user agent fetch and apply a given speculation rule set", served as `application/speculationrules+json`.
- [Chromium: `script_loader.cc`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/script/script_loader.cc): the import map branch under `HasSourceAttribute()` dispatches `error` and returns; the speculation rules branch logs "External speculation rules are not yet supported."
- [Firefox: `ScriptLoader.cpp`](https://github.com/mozilla-firefox/firefox/blob/main/dom/script/ScriptLoader.cpp): step 33.1 fires `error` for either type, with the `ImportMapExternalNotSupported` and `SpeculationRulesExternalNotSupported` console messages.
- [WebKit: `ScriptElement.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/dom/ScriptElement.cpp): for `ScriptType::ImportMap` and `ScriptType::SpeculationRules`, `hasSourceAttribute()` queues `dispatchErrorEvent()` and returns.
- [MDN: `<script type="importmap">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap): "The `src`, `async`, `nomodule`, `defer`, `crossorigin`, `integrity`, and `referrerpolicy` attributes must not be specified."
