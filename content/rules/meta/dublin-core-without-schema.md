---
ruleId: "meta/dublin-core-without-schema"
title: "<meta name> Dublin Core without schema"
description: "DC and DCTERMS meta names without a matching schema link bind to no URI, so harvesters skip them."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "community"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Declare the namespace, then keep the names: <link rel=\"schema.DC\" href=\"http://purl.org/dc/elements/1.1/\"> beside <meta name=\"DC.title\" content=\"The title\">. Use schema.DCTERMS for DCTERMS names."
tags: ["structured-data"]
impacts: ["maintainability"]
related: ["attr/meta-scheme"]
---

A `DC.*` or `DCTERMS.*` meta name without its `schema.*` declaration binds to no URI. Harvesters skip the metadata while the author believes it published.

## Why avoid

DC-HTML binds a prefixed name to a URI through a namespace declaration alone. With no declaration, the spec states outright that no URI can be generated for the name.

An unbound name reaches no harvester. Library catalogs and archives reading Dublin Core see an empty set where the author sees described metadata.

The WHATWG keyword registry repeats the requirement on every DC entry. Each one has to travel with its schema link.

Prefix matching forgives case but nothing else. A lowercase `dc.title` binds under an uppercase `SCHEMA.DC` declaration, yet binds under nothing at all without one.

## Use instead

Declare the namespace beside the names it binds:

```html
<link rel="schema.DC" href="http://purl.org/dc/elements/1.1/">
<meta name="DC.title" content="How to deadhead roses">
```

## Detectability

Unpairable by selector, which is why this is a `kind: "document"` rule: no selector can pair `meta` names with `link` declarations. The logic in `packages/rules/logic/meta/dublin-core-without-schema.ts` collects declared prefixes from `schema.` rel tokens carrying `href`, then reports each `DC.*` or `DCTERMS.*` name with no declaration. The check reads attributes, never source offsets, so it reports in all three adapters.

A fragment, a file with no doctype and no `<html>` tag, is not checked: the `schema.DC` link can sit in another partial of the same page.

## Resources

- [DCMI: expressing Dublin Core in HTML meta/link](https://www.dublincore.org/specifications/dublin-core/dc-html/): no declaration means no URI for the name, with worked bound and unbound examples.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): every DC entry carries the accompaniment requirement.
