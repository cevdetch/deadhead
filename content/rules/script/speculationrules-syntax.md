---
ruleId: "script/speculationrules-syntax"
title: "<script type=\"speculationrules\"> with invalid JSON"
description: "Speculation rules that fail to parse, or whose top level is not a JSON object, are dropped whole: nothing is prefetched."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Make the text one JSON object: {\"prerender\": [{\"where\": {\"href_matches\": \"/*\"}, \"eagerness\": \"moderate\"}]}. No trailing commas or comments."
tags: ["resource-hints"]
impacts: ["performance"]
related: ["attr/script-src", "script/json-ld-syntax", "link/prerender"]
---

A `<script type="speculationrules">` whose text is not valid JSON, or whose top level is not a
JSON object, prefetches and prerenders nothing. The browser drops the whole set, and a console
error is the one trace.

## Why avoid

The HTML Standard parses the text as JSON, which throws on a syntax error, and then: "If parsed
is not a map, then throw a TypeError indicating that the top-level value needs to be a JSON
object." A throw leaves no rule set, so no rule in the block runs. MDN lists the same
`TypeError`.

## Use instead

```html
<script type="speculationrules">
{
  "prerender": [{ "where": { "href_matches": "/*" }, "eagerness": "moderate" }]
}
</script>
```

## Detectability

The logic in `packages/rules/logic/script/speculationrules-syntax.ts` runs `JSON.parse` on each
block and reports the parser's message or a top level that is not an object. A set with `src`
belongs to `attr/script-src`. All three adapters read the same text. A rule with an unknown
key or a bad `where` clause is out of scope: the browser skips that rule and keeps the rest.
There is no autofix.

## Resources

- [HTML Standard: speculative loading](https://html.spec.whatwg.org/multipage/speculative-loading.html): the JSON parse and the TypeError for a top level that is not a map.
- [MDN: speculationrules](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/speculationrules): the `TypeError` for a definition that is not a JSON object.
