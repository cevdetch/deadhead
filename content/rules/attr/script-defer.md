---
ruleId: "attr/script-defer"
title: "<script defer> on a module, inline or async script"
description: "Browsers ignore defer on module, inline, import map and speculation rules scripts, and next to async. Deleting it changes nothing."
pubDate: "2026-09-29"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: "script[defer]"
match: "logic"
fix: { op: "remove-attribute", attr: "defer" }
replacement: "Delete defer. Modules already defer, inline scripts run at once, and async wins when both are set."
tags: ["scripting"]
impacts: ["maintainability"]
related: ["attr/script-nomodule", "attr/script-src"]
---

`defer` asks the browser to fetch an external classic script in parallel and run it after
parsing. On any other script, and next to `async`, no browser reads it. The attribute sits
in the markup and changes nothing.

## Why avoid

HTML's table of script attributes marks `defer` as not allowed on module scripts, inline
classic scripts, import maps and speculation rules. Each case is inert:

- **Module scripts** defer by default. HTML: "The defer attribute has no effect on module
  scripts." MDN adds that "they defer by default".
- **Inline classic scripts** have nothing to fetch, and every engine runs them at once.
- **Import maps and speculation rules** are processed on the spot.
- **`async defer`** on an external classic script runs as `async`. HTML checks `async`
  first and keeps `defer` for "legacy web browsers that only support defer (and not
  async)". This case is conforming HTML; its audience is gone. `async` shipped in Internet
  Explorer 10, Firefox 3.6, Chrome 8 and Safari 5.1.

The Web Almanac 2022 calls the pair "an antipattern that should be avoided as the defer part
is ignored and async takes precedence", and in 2024 counts it on 22% of pages. Google's Maps
loader snippet, the best-known source of the pattern, now shows `async` alone.

## Use instead

```html
<script type="module" src="/app.js"></script>
<script async src="https://maps.googleapis.com/maps/api/js?key=KEY&loading=async&callback=initMap"></script>
<script>init();</script>
```

Keep `defer` on an external classic script without `async`, where it takes effect.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings; none skips. The selector prefilters to `script[defer]`. The module
in `packages/rules/logic/attr/script-defer.ts` takes the script's type as HTML does and
reports an inline classic script, a classic script with `src` and `async`, and a type of
`module`, `importmap` or `speculationrules`. A classic script with `src` and no `async`
stays quiet, and so do data blocks, which HTML leaves to "author script or other tools".

An empty classic script with no `src` stays quiet too: it is a placeholder a delay-JS loader
fills later. HTML's "prepare the script element" returns before marking such a script
started, so setting `src` prepares it again and `defer` is read then.

The autofix deletes `defer`. Chromium, Firefox and WebKit test `async` before `defer` and
read `defer` on external classic scripts alone, so every script runs as before.
The es-module-shims polyfill reads `async` on a module script and never `defer`.

## Resources

- [HTML Standard: the `script` element](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer): the table of allowed attributes, "(The defer attribute has no effect on module scripts.)", and "The defer attribute may be specified even if the async attribute is specified, to cause legacy web browsers that only support defer (and not async) to fall back to the defer behavior".
- [HTML Standard: prepare the script element](https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element): "If el has an async attribute or el's force async is true" comes before "Otherwise, if el has a defer attribute or el's type is "module"".
- [MDN: `<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script): "The `defer` attribute has no effect on module scripts — they defer by default", and with `async` "the element will act as if only the `async` attribute is specified".
- [Can I use: `async` attribute for external scripts](https://caniuse.com/script-async): Internet Explorer 10, Firefox 3.6, Chrome 8 and Safari 5.1 onward, 97.26% of usage.
- [Web Almanac 2024: JavaScript](https://almanac.httparchive.org/en/2024/javascript): `async` and `defer` together on 22% of pages; the [2022 edition](https://almanac.httparchive.org/en/2022/javascript) calls the pair "an antipattern that should be avoided as the defer part is ignored and async takes precedence".
