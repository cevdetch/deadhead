---
ruleId: "script/json-ld-unescaped-lt"
title: "<script type=\"application/ld+json\"> with literal </"
description: "A literal </ in a JSON-LD block shows its serializer does not escape it; a value holding </script> ends the block and runs as HTML."
pubDate: "2026-09-23"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "partial"
kind: "element"
scope: "any"
selector: 'script[type="application/ld+json" i]'
match: "logic"
fix: { op: "none" }
replacement: "Escape < when serializing: JSON.stringify(data).replace(/</g, \"\\\\u003c\"). JSON reads \\u003c as the same character, so the data is unchanged."
tags: ["scripting", "structured-data"]
impacts: ["security", "seo"]
related: ["script/json-ld-syntax", "script/json-ld-search-action"]
---

The HTML parser does not know a JSON-LD block holds JSON. It reads the element's text as
script data up to the first `</script`, string or no string. `JSON.stringify` leaves `<`
literal, so a value that carries `</script>` ends the block and turns the rest of the
value into markup.

## Why avoid

The break-out is a stored-XSS path with a shipped exploit. GitHub advisory
GHSA-2ggx-79g6-2jmj (Hi.Events, CVE-2026-60119, rated high) records it in a JSON-LD
block: the event page rendered
`<script type="application/ld+json">{JSON.stringify(schemaOrgJSONLD)}</script>`, and
"JSON.stringify() does not escape the sequence </script>". An organizer's event title
closed the block and ran script in the browser of every visitor, administrators included.
The Next.js JSON-LD guide carries the same warning: `JSON.stringify` "does not sanitize
malicious strings used in XSS injection".

The reverse sequence breaks the page. The HTML Standard requires every `script` element's
text to match its `script` grammar, which forbids an unclosed `<!--` and a `<script`
inside one. §4.12.1.3 shows why: after `<!--` and `<script`, the parser no longer ends the
element at `</script>`, and the markup after the block becomes script text that never
renders.

Search engines lose the data in both cases. A truncated or overrun block fails
`JSON.parse`, and a JSON-LD processor discards the whole block on the first syntax error.

## Use instead

Escape `<` when serializing, as the Next.js guide does:

```js
const json = JSON.stringify(data).replace(/</g, "\\u003c");
```

The output carries no literal `<`, and consumers read the same value:

```html
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Event","name":"\u003c/script> Night"}</script>
```

Fix the serializer and not the page. An edited page stays safe until the next render
writes the old output back.

## Detectability

Partial. The rule reports a JSON-LD block whose text holds a literal `</`, and each
finding carries `possible: true`. A literal `</` proves the serializer passes it through,
so it would pass `</script` too; it does not prove an attack. A block with no `<` today proves nothing: the same serializer emits `</script>`
the day a value carries it. The CLI, the bookmarklet and the ESLint plugin all report;
none skips, since the check reads the element's text and no source offset.

A serializer that escapes the slash (`<\/p>`) or the `<` (`\u003c`) emits `</script`
safely, and a bare `<` such as `"5 < 6"` cannot end the block, so neither reports. On the
top 10,000 home pages of 2026-10-04, 7 of 45 flagged blocks escaped the slash this way.

A `</script>` already in a value ends the element at parse time, so the rule sees the
truncated block. That page trips `script/json-ld-syntax` for the broken JSON. Other inline data blocks, such as
`application/json` and hydration state, carry the same risk and are out of scope.

There is no autofix. The fix rewrites `<` to `\u003c`, and every fix op subtracts; the
rewrite also belongs in the serializer.

## Resources

- [HTML Standard §4.12.1.3: Restrictions for contents of script elements](https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements): the `script` grammar every script's text must match, the advice to escape `<!--`, `<script` and `</script`, and the worked example of an unterminated block.
- [Next.js: How to implement JSON-LD](https://nextjs.org/docs/app/guides/json-ld): `JSON.stringify` "does not sanitize malicious strings used in XSS injection", and the reference snippet's `.replace(/</g, '\\u003c')`.
- [GitHub advisory GHSA-2ggx-79g6-2jmj (Hi.Events, CVE-2026-60119)](https://github.com/HiEventsDev/Hi.Events/security/advisories/GHSA-2ggx-79g6-2jmj): a stored XSS through `</script>` in an `application/ld+json` block, published 2026-07-13, severity high.
