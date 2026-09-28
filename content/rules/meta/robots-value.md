---
ruleId: "meta/robots-value"
title: "<meta name=\"robots\"> or \"googlebot\" with unknown directive"
description: "An unknown robots token is ignored, so a typo voids indexing intent with no warning."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="robots" i], meta[name="googlebot" i]'
match: "logic"
fix: { op: "none" }
replacement: "Spell the directive from the valid table: <meta name=\"robots\" content=\"noindex, nofollow\">. Re-check every token against the table when the intent is exclusion."
tags: ["search"]
impacts: ["seo"]
related: ["meta/http-equiv-robots"]
---

A `robots` tag carrying a token outside the valid table asks for something no crawler honors. Google ignores the token, so a typo voids indexing intent with no warning.

## Why avoid

Google ignores what it does not list. An unknown token changes nothing, so `no-follow` follows links and `no-index` indexes the page.

The danger concentrates on exclusion typos. A mistyped `noindex` publishes what the author meant to hide, and nothing warns them.

Retired names trip too. `noarchive`, `nocache` and `nositelinkssearchbox` sit in Google's historical section as ignored, and `noodp`/`noydir` appear in neither table, so all five fail the same check.

## Use instead

Write valid directives, comma-separated:

```html
<meta name="robots" content="noindex, nofollow">
```

## Detectability

Detectable with logic refining the selector. The selector prefilters to `robots` and `googlebot` tags; the module in `packages/rules/logic/meta/robots-value.ts` folds `content` to lowercase and splits it on commas first. An item with a colon splits on its first colon into `name: value`; an item without one splits on whitespace into bare names. Each name is checked against the fourteen valid names, and parameterized names need a well-formed value. Google accepts RFC 822 and RFC 850 dates for `unavailable_after`, and those carry a comma of their own (`Sat, 25 Jun 2010 15:00:00 GMT`), so the items after an `unavailable_after` item fold back into its date until one opens with a valid name. Google documents comma-separated lists, so `noindex max-snippet:50` without the comma is reported: its first colon yields the name `noindex max-snippet`. The finding points at the tag.

## Resources

- [Google Search Central: robots meta tag specifications](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): the valid-rules table, case-insensitivity, comma-separated lists, ignored-if-unparseable parameters, and the historical ignored section.
- [MDN: `<meta name="robots">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/robots): the keyword list, the comma-separated form, and the undefined-conflicts note.
- [Google Search Central: meta tags Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags): clients ignore tags they do not support, and the restrictive tag wins conflicts.
