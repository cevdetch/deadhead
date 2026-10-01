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

A `<script type="importmap">` that is not valid JSON, or whose top level, `imports`, `scopes`
or `integrity` is not a JSON object, maps nothing. The browser registers no map, and every
`import` of a bare specifier the map was meant to resolve throws.

## Why avoid

The HTML Standard parses the text as JSON, then: "If parsed is not an ordered map, then throw a
TypeError indicating that the top-level value needs to be a JSON object", with the same throw
for `imports`, `scopes` and `integrity`. Registration reports the error and returns with no map
merged. An `import "lit"` the map was meant to resolve then ends in "a TypeError indicating that
specifier was a bare specifier, but was not remapped to anything", and the module graph fails.

## Use instead

```html
<script type="importmap">
{ "imports": { "lit": "/vendor/lit.js" } }
</script>
```

## Detectability

The logic in `packages/rules/logic/script/importmap-syntax.ts` runs `JSON.parse` on each map
and reports the parser's message, or a top level or key that is not an object. A map with
`src` belongs to `attr/script-src`. A bad address inside `imports` drops one entry with a console warning and is out of
scope. There is no autofix.

## Resources

- [HTML Standard: parse an import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string): the TypeErrors for the top level and its three keys, and the bare-specifier TypeError.
- [MDN: importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap): the `TypeError` for a definition that "is not a JSON object".
