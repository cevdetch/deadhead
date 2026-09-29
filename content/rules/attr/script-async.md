---
ruleId: "attr/script-async"
title: "<script async> without src, outside modules"
description: "Browsers ignore async on an inline classic script, an import map or speculation rules; it works on src and module scripts alone."
pubDate: "2026-09-29"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: "script[async]:not([src])"
match: "logic"
fix: { op: "remove-attribute", attr: "async" }
replacement: "Delete async. Inline classic scripts run at once, and import maps and speculation rules apply on the spot; async needs src or a module."
tags: ["scripting"]
impacts: ["maintainability"]
related: ["attr/script-defer", "attr/script-src"]
---

`async` asks the browser to fetch a script in parallel and run it the moment it arrives. A
script without `src` has nothing to fetch. On an inline classic script, an import map or
speculation rules, no browser reads the attribute.

## Why avoid

HTML's table of script attributes marks `async` as not allowed on inline classic scripts,
import maps and speculation rules. An inline classic script runs where it sits, and import
maps and speculation rules are processed on the spot. MDN says the attribute "must not be
used if the `src` attribute is absent (i.e., for inline scripts) for classic scripts, in this
case it would have no effect."

An inline module is the exception. There `async` runs the module as soon as its imports
load, instead of after parsing, so this rule leaves it alone.

## Use instead

```html
<script>init();</script>
<script type="importmap">{"imports": {"preact": "/vendor/preact.mjs"}}</script>
<script async src="/analytics.js"></script>
```

Keep `async` on a script with `src`, or on a module.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings; none skips. The selector prefilters to `script[async]:not([src])`.
The module in `packages/rules/logic/attr/script-async.ts` takes the script's type as HTML
does and reports a classic script, an import map and speculation rules. An inline module
stays quiet, and so do data blocks, which HTML leaves to "author script or other tools". An
import map or speculation rules with `src` belongs to `attr/script-src`.

The autofix deletes `async`. Firefox computes the flag for external and module scripts
alone and notes that "inline classic scripts ignore both these attributes"; Chromium and
WebKit run the reported scripts without consulting it.

## Resources

- [HTML Standard: the `script` element](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-async): the table of allowed attributes, which marks `async` as not allowed on inline classic scripts, import maps and speculation rules.
- [HTML Standard: prepare the script element](https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element): the async branch applies to a classic script with `src` or a module script.
- [MDN: `<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script): "This attribute must not be used if the `src` attribute is absent (i.e., for inline scripts) for classic scripts, in this case it would have no effect."
- [Firefox: `ScriptLoader.cpp`](https://github.com/mozilla-firefox/firefox/blob/main/dom/script/ScriptLoader.cpp): "Only the 'async' attribute is heeded on an inline module script and inline classic scripts ignore both these attributes."
