---
ruleId: "script/json-ld-syntax"
title: "<script type=\"application/ld+json\"> with invalid JSON"
description: "Unparsed JSON-LD is discarded whole; fix the syntax so the data reaches crawlers."
pubDate: "2026-09-14"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Make the block valid JSON: double-quoted keys and strings, no trailing commas, no comments. Serialise it with JSON.stringify instead of a string template."
tags: ["structured-data"]
impacts: ["seo"]
related: ["attr/script-type-javascript"]
---

One stray comma discards the whole JSON-LD block. Structured data in a `<script type="application/ld+json">`
block is how most sites describe
their articles and products to search engines. Events and breadcrumbs travel in the same
blocks. The block is a data
block: the browser never runs or renders it, so nothing on the page shows whether it's valid.
Search Console is where authors find out.

## Why avoid

A syntax error doesn't cost a property. It costs the whole block. The JSON-LD 1.1 processing
algorithm for HTML is explicit: "If source is not a valid JSON document, an invalid script
element has been detected, and processing is aborted." One trailing comma after the last
property throws away the `@type`, the headline, the author, the dates, all of it.

Google treats it as a critical error. Its *Unparsable structured data* report exists for
exactly this case: "The intended type of structured data (Job, Event, and so on) could not be
determined because of the parsing error", and "All items in this report are critical
structured data errors". The examples it lists are ordinary JSON slips: "Missing a comma or
closing brace", "Invalid escape sequence used in a string value". A page whose markup can't be
parsed isn't eligible for the rich results the markup was written to earn.

It's a template bug. A loop that leaves a comma after the last item, a title
with an unescaped double quote or a raw newline, a `//` comment, single-quoted strings copied
from JavaScript. Because the block is invisible, the bug ships to every page the template
renders.

## Use instead

Valid JSON, generated from data instead of assembled from strings:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "A title with \"quotes\" escaped",
  "datePublished": "2026-09-14"
}
</script>
```

Serialise with `JSON.stringify(data)`, and replace `<` with `\u003c` in the output so a
`</script>` inside a value can't end the element early. The JSON-LD specification warns
about exactly that sequence.

## Detectability

Fully detectable. The rule parses every `script[type="application/ld+json"]` with `JSON.parse`, and
reports a block that fails with the parser's own message as the detail. That message
comes from the JavaScript engine running the check, so its wording differs between the CLI
and a bookmarklet in another browser. An empty or whitespace-only block stays quiet: it is a placeholder a script fills.

This checks JSON syntax only. Valid JSON that is wrong as JSON-LD or schema.org, like an
unknown `@type` or a missing required property, is a different problem. The Rich Results
Test and the Schema Markup Validator cover that.

It is a document rule rather than a selector because only a document rule can attach the
parser message to the finding. There is no autofix.

## Resources

- [W3C: JSON-LD 1.1 Processing Algorithms and API](https://www.w3.org/TR/json-ld11-api/): "If source is not a valid JSON document, an invalid script element has been detected, and processing is aborted."
- [W3C: JSON-LD 1.1: Embedding JSON-LD in HTML documents](https://www.w3.org/TR/json-ld11/#embedding-json-ld-in-html-documents): the `application/ld+json` data block, and the restrictions on its contents.
- [Google Search Console Help: Unparsable structured data report](https://support.google.com/webmasters/answer/9166415): a parsing error means the type can't be determined; every item is a critical error.
- [Google Search Central: General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): test with the Rich Results Test; items with issues aren't eligible for rich results.
