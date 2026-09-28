---
ruleId: "attr/script-nomodule"
title: "<script nomodule>"
description: "Every browser released since May 2018 skips a classic script marked nomodule and fetches nothing; it serves older browsers alone."
pubDate: "2026-09-28"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: "script[nomodule]"
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete it, or the build option that emits it. On a Vite legacy build, drop @vitejs/plugin-legacy: its fallback reads the elements with an id."
tags: ["scripting"]
impacts: ["maintainability", "performance"]
related: ["attr/script-language", "attr/script-type-javascript", "link/preload-module"]
---

A classic script marked `nomodule` runs in browsers without module support and nowhere
else. Every browser released since May 2018 supports modules, so the element sits in the
page and does nothing.

## Why avoid

HTML's "prepare the script element" returns for a classic script with a `nomodule`
attribute. The step comes before the Content Security Policy check and before any fetch:
a current browser neither downloads the file nor runs the inline code. MDN states the
outcome: browsers that support `type="module"` "ignore any script with a `nomodule`
attribute".

The browsers left are old. Chrome 61, Edge 16, Firefox 60, Safari 11 and iOS Safari 11
first shipped modules, and the last of them arrived on 2018-05-09. JavaScript modules are
Baseline `widely available` since 2020-11-09, and caniuse counts 96.54% of global usage
with support. Deleting an element no script reads changes behaviour in browsers released
before May 2018 and in no other.

The cost lands on every visitor and every build. An inline fallback ships its code in each
HTML response. The fallback bundle keeps a second, transpiled build and a polyfill set
alive for browsers from before 2018.

One pattern still reads the element. Vite's `@vitejs/plugin-legacy` emits
`<script nomodule id="vite-legacy-polyfill">` and `<script nomodule id="vite-legacy-entry">`.
When a browser supports modules and fails Vite's modern check, a module script reads the
`src` of the first and the `data-src` of the second. Since vitejs/vite#21662 the check
requires `import.meta.resolve`, and the plugin's source names Safari 15 among the browsers
on that path. The rule reports these elements and leaves them in place.

## Use instead

Ship the module build alone:

```html
<script type="module" src="/app.js"></script>
```

Delete the `nomodule` script, and at the source the build option that emits it. A Vite
build drops `@vitejs/plugin-legacy` from its config, and the markup goes with it. A
support matrix that still lists Safari 15 keeps the plugin: its elements with an `id` keep
their finding and carry no autofix.

## Detectability

Detectable with a selector plus logic. The CLI, the bookmarklet and the ESLint plugin
report the same findings, and none skips. `script[nomodule]` pre-filters, and
`packages/rules/logic/attr/script-nomodule.ts` reports when the element prepares as a
classic script. That covers a missing or empty `type`, a JavaScript MIME type essence
match, and the `language` fallback HTML still reads.

A module script, an import map, speculation rules and a data block stay out. HTML skips
none of them for `nomodule`, and on a module script the attribute "has no effect". Fixing
that case removes the attribute and keeps the element, so this rule does not claim it.

An element with an `id` keeps its finding and carries no autofix. A script can find it by
that `id` and read it, as Vite's legacy fallback does. The bookmarklet reads the live DOM,
where the parser still inserts the skipped element; it reports the same finding with no
fix, as for every rule.

## Resources

- [HTML Standard: prepare the script element](https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element): "If el has a nomodule content attribute and its type is "classic", then return." The step precedes the CSP check and every fetch, and a note adds that "specifying nomodule on a module script has no effect".
- [HTML Standard: the `nomodule` attribute](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-nomodule): it "prevents a script from being executed in user agents that support module scripts". The attribute table lists it for external and inline classic scripts alone.
- [MDN: `<script>`, module fallback](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script#module_fallback): "Browsers that support the `module` value for the `type` attribute ignore any script with a `nomodule` attribute."
- [web-features: `js-modules`](https://github.com/web-platform-dx/web-features/blob/main/features/js-modules.yml): Baseline since 2018-05-09, `widely available` since 2020-11-09; `html.elements.script.nomodule` carries the same status.
- [Can I use: JavaScript modules via script tag](https://caniuse.com/es6-module): 96.54% of global usage. Safari 10.1 supports modules with no `nomodule`, and legacy Edge 16 to 18 fetched `nomodule` scripts without running them.
- [Vite: `plugin-legacy` snippets](https://github.com/vitejs/vite/blob/main/packages/plugin-legacy/src/snippets.ts): the module fallback calls `document.getElementById("vite-legacy-polyfill")` and reads the `data-src` of `vite-legacy-entry`. [vitejs/vite#21662](https://github.com/vitejs/vite/pull/21662) raised the modern threshold to `import.meta.resolve`.
