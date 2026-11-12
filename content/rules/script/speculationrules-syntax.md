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

Speculation rules tell the browser which pages to fetch, or render in full, before the visitor
navigates to them: a `list` of URLs, or a `where` clause that matches links in the document.
Chrome and Edge have supported them since version 109, with `where` rules and `eagerness` since
121, and prerender pages as well as prefetching them. MDN's compatibility data lists Safari 27.3
with prefetch, and Firefox with prefetch of URL lists in preview. A browser without support
treats the element as a data block and ignores it.

## Why avoid

The HTML Standard parses the text as JSON, which throws on a syntax error, and then: "If parsed
is not a map, then throw a TypeError indicating that the top-level value needs to be a JSON
object." A throw leaves no rule set, so no rule in the block runs. MDN lists the same
`TypeError`.

JSON is stricter than the JavaScript it resembles, and the block reads like JavaScript. The
errors that break it are the ones a script would forgive:

- a trailing comma after the last rule or the last key;
- a `//` or `/* */` comment explaining a rule;
- single quotes, or an unquoted key such as `eagerness: "moderate"`;
- a template engine that HTML-escapes the JSON into `{&quot;prerender&quot;: …}`. Script text
  is raw text: the parser decodes no character references inside it, so the browser sees the
  entities;
- an array at the top level, from wrapping the object in `[ ]`.

The cost is the speed-up the block was there to buy. A prerendered page can appear at once on
navigation; with the set dropped, every navigation goes to the network as if the block were
absent. Nothing on the page breaks, so the loss shows up only in navigation timings or in the
console.

## Use instead

One JSON object per block, with `prefetch` or `prerender` keys holding arrays of rules:

```html
<!-- Before: the trailing comma makes the whole set invalid -->
<script type="speculationrules">
{
  "prerender": [{ "where": { "href_matches": "/*" }, "eagerness": "moderate" },]
}
</script>

<!-- After -->
<script type="speculationrules">
{
  "prerender": [{ "where": { "href_matches": "/*" }, "eagerness": "moderate" }]
}
</script>
```

Generate the block with a JSON serialiser, such as `JSON.stringify`, never by string
concatenation, and insert it without HTML escaping. A JSON value can still end the script early:
a string holding `</script>` closes the element. Escape `<` as `\u003c` inside JSON strings, as
JSON allows. Chrome DevTools lists each rule set in the Speculative loads panel of the
Application tab, which helps when the JSON parses and the rules still do not match.

The rules can also live outside the page. A `Speculation-Rules` response header names a JSON
file, which MDN says "must be served with an `application/speculationrules+json` MIME type". The
file parses by the same rules. A site whose Content Security Policy sets `script-src` needs
`'inline-speculation-rules'` there, with a hash or nonce, for an inline block to run at all.

## Detectability

The logic in `packages/rules/logic/script/speculationrules-syntax.ts` runs `JSON.parse` on each
block and reports the parser's message or a top level that is not an object. The CLI, the
bookmarklet and the ESLint plugin report the same findings, and none skips. A set with `src`
belongs to `attr/script-src`. The `type` matches without regard to ASCII case and after
whitespace is stripped, as HTML reads it.

Errors inside a valid object are out of scope. A rule with an unknown key or a bad `where`
clause is dropped on its own, and the browser keeps the rest; a misspelt top-level key such as
`"prerendr"` is never read. The standard also drops the whole set for a top-level `tag` that is
not a valid tag, which this rule does not check. There is no autofix.

## Resources

- [HTML Standard: speculative loading](https://html.spec.whatwg.org/multipage/speculative-loading.html): the JSON parse, the TypeError for a top level that is not a map or an invalid `tag`, and per-rule handling that returns null for unrecognised keys.
- [MDN: speculationrules](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/speculationrules): the `TypeError` for a definition that is not a JSON object, the `Speculation-Rules` header, and the `'inline-speculation-rules'` CSP source.
- [MDN: `Speculation-Rules` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Speculation-Rules): the external rule file "must be served with an application/speculationrules+json MIME type".
- [Chrome for Developers: debug speculation rules](https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules): the Speculative loads panels list rule sets and help find "syntax errors in the JSON".
- [MDN browser-compat-data: `html.elements.script.type.speculationrules`](https://github.com/mdn/browser-compat-data/blob/main/html/elements/script.json): Chrome and Edge 109, `where` and `eagerness` in 121, Safari 27.3, Firefox in preview.
