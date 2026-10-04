---
ruleId: "meta/referrer-value"
title: "<meta name=\"referrer\"> with unknown token"
description: "An unknown referrer token is ignored, so the page falls back to default and can leak more than intended."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="referrer" i]'
match: "logic"
fix: { op: "none" }
replacement: "Spell the policy from the table: <meta name=\"referrer\" content=\"strict-origin-when-cross-origin\">. Match the token to the leak level the page tolerates."
tags: ["hyperlinks"]
impacts: ["security"]
related: ["meta/robots-value"]
---

A `referrer` tag with a token outside the policy table asks for something no browser honors. Unknown values are ignored, and the page falls back to default.

## Why avoid

Unknown policy values are ignored by spec, with the page falling back to default. A typo therefore swaps the author's order for the default with no warning.

The default sends full URLs cross-origin over https. An author who wanted `no-referrer` and typed `no-referer` leaks paths and queries to every linked host.

The policy table names each leak in advance. `origin` and `origin-when-cross-origin` spill origins over http, and `unsafe-url` spills full URLs everywhere by its own admission.

## Use instead

Write a valid token, matched to the leak level:

```html
<meta name="referrer" content="strict-origin-when-cross-origin">
```

## Detectability

Detectable with logic refining the selector. The selector prefilters to `referrer` tags; the module in `packages/rules/logic/meta/referrer-value.ts` trims ASCII whitespace, folds to lowercase, and demands an exact hit on the eight policies or the four legacy keywords HTML maps onto them (`never`, `default`, `always`, `origin-when-crossorigin`). Multi-token and empty values trip, since the field holds a single keyword.

## Resources

- [W3C: Referrer Policy](https://www.w3.org/TR/referrer-policy/): the eight policies, the unknown-values ignore rule, and the leak analysis.
- [MDN: `<meta name="referrer">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/referrer): the eight values with the default behavior called out.
- [Referrer Policy living draft](https://w3c.github.io/webappsec-referrer-policy/): the current default is `strict-origin-when-cross-origin`, and the enum still lists eight plus empty.
