---
ruleId: "script/importmap-syntax"
title: "<script type=\"importmap\"> with invalid JSON"
description: "An import map that fails to parse, or whose top level or imports is not a JSON object, is dropped; bare imports then throw."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Make the text one JSON object whose imports, scopes and integrity are objects: {\"imports\": {\"lit\": \"/vendor/lit.js\"}}."
tags: ["scripting"]
impacts: ["interop"]
related: ["attr/script-src", "script/speculationrules-syntax", "script/json-ld-syntax"]
---

A `<script type="importmap">` that is not valid JSON, or whose top level, `imports`, `scopes` or
`integrity` is not a JSON object, maps nothing. The browser registers no map, and every `import`
of a bare specifier the map was meant to resolve throws.

An import map tells the browser what a bare specifier such as `"lit"` or `"lodash/debounce"`
means, so module code can import packages by name without a bundler. `imports` maps specifiers
to URLs, `scopes` overrides them for modules under a path, and `integrity` pins hashes for
module URLs. Chrome 89, Firefox 108 and Safari 16.4 support import maps; `integrity` came in
Chrome 127, Safari 18 and Firefox 138.

## Why avoid

The HTML Standard parses the text as JSON, then: "If parsed is not an ordered map, then throw a
TypeError indicating that the top-level value needs to be a JSON object", with the same throw
for `imports`, `scopes` and `integrity`. Registration reports the error and returns with no map
merged. An `import "lit"` the map was meant to resolve then ends in "a TypeError indicating that
specifier was a bare specifier, but was not remapped to anything", and the module graph fails.

The failure is total. A single broken map leaves every module that imports by name unable to
load, and with it every module that imports one of those. A page that renders its interface from
modules shows nothing past the HTML, and the console holds a parse error for the map followed by
a resolution error for each import that needed it. The cause sits in a JSON block that reads
like JavaScript:

- a trailing comma after the last mapping;
- a comment, or single quotes around a specifier;
- `imports` written as an array of URLs, which is not a map from names to addresses;
- a server-side template that HTML-escapes the JSON. Script text is raw text, so `&quot;` stays
  `&quot;` and the JSON no longer parses.

## Use instead

One JSON object, with `imports` and `scopes` as objects from specifiers to URLs:

```html
<!-- Before: the trailing comma drops the whole map -->
<script type="importmap">
{ "imports": { "lit": "/vendor/lit.js", } }
</script>

<!-- After -->
<script type="importmap">
{
  "imports": {
    "lit": "/vendor/lit.js",
    "lodash/": "/vendor/lodash-es/"
  }
}
</script>
<script type="module">
  import { LitElement } from "lit";
</script>
```

A key ending in `/` maps a whole package path, so `"lodash/"` resolves
`import debounce from "lodash/debounce.js"`. Place the map before the first module script that
needs it: the standard merges a later map into the current one, but a specifier a module has
already resolved keeps its first resolution, and browsers older than Chrome 133, Safari 18.4 and
Firefox 150 support one import map alone. Generate the map with a JSON serialiser, such as
`JSON.stringify`, and insert it without HTML escaping. An unknown top-level key, such as a
misspelt `"import"`, is not an error: the standard asks only for a console warning, "This can
help detect typos".

## Detectability

The logic in `packages/rules/logic/script/importmap-syntax.ts` runs `JSON.parse` on each map and
reports the parser's message, or a top level or key that is not an object. The CLI, the
bookmarklet and the ESLint plugin report the same findings, and none skips. A map with `src`
belongs to `attr/script-src`. A bad address inside `imports` drops one entry with a console
warning and is out of scope, and so is an unknown top-level key. There is no autofix.

## Resources

- [HTML Standard: parse an import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string): the TypeErrors for the top level and its three keys, the console warning for other top-level keys, and the bare-specifier TypeError.
- [HTML Standard: merge existing and new import maps](https://html.spec.whatwg.org/multipage/webappapis.html#merge-existing-and-new-import-maps): later maps merge in, and rules for specifiers already resolved are ignored.
- [MDN: importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap): the `TypeError` for a definition that "is not a JSON object", and keys ending in `/` for path prefixes.
- [MDN browser-compat-data: `html.elements.script.type.importmap`](https://github.com/mdn/browser-compat-data/blob/main/html/elements/script.json): Chrome 89, Firefox 108, Safari 16.4; `integrity` in Chrome 127, Firefox 138, Safari 18; multiple import maps in Chrome 133, Safari 18.4, Firefox 150.
