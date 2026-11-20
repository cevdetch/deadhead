---
ruleId: "attr/microdata-without-itemscope"
title: "[itemtype], [itemref], [itemid] without [itemscope]"
description: "itemtype, itemref and itemid need itemscope; without it no microdata item forms, and the attributes type and link nothing."
pubDate: "2026-09-23"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: "[itemtype]:not([itemscope]), [itemref]:not([itemscope]), [itemid]:not([itemscope]), [itemid]:not([itemtype])"
fix: { op: "none" }
replacement: "Add itemscope where the element is meant to be an item, or describe the thing in one schema.org JSON-LD block and delete the microdata attributes."
tags: ["structured-data"]
impacts: ["seo", "maintainability"]
related: ["attr/data-vocabulary", "attr/xmlns-prefix", "script/json-ld-search-action"]
---

Microdata items start at `itemscope`. The attributes that describe an item, `itemtype` for
its type, `itemid` for its global identifier and `itemref` for properties elsewhere on the
page, attach to the element that carries `itemscope`. On an element without it they
describe an item that does not exist.

## Why avoid

The HTML Standard §5.2.2 states the model in one sentence: "An element with the itemscope
attribute specified creates a new item." The same section forbids the three attributes
anywhere else: "The itemtype attribute must not be specified on elements that do not have
an itemscope attribute specified." `itemref` gets the same sentence, and `itemid` "must not
be specified on elements that do not have both an itemscope attribute and an itemtype
attribute specified".

With no item, the attributes carry nothing. The type names no item, the reference list
pulls nothing in, and the identifier identifies nothing. What stays is a promise of
structured data that consumers following the microdata model never read, and a validator
error on every occurrence. Themes ship the pattern at volume: one Enfold support thread
reports 388 of the `itemtype` error on a single site.

The missing scope can also move data. The model crawls `itemprop` descendants up to the
nearest `itemscope`, so in an `Article`, a
`<div itemprop="author" itemtype="https://schema.org/Person">` holding
`<span itemprop="name">Ada Lovelace</span>` publishes the author as the plain text
"Ada Lovelace" and hands the name to the Article.

## Use instead

Where the element is meant to be an item, add `itemscope`:

```html
<div itemprop="author" itemscope itemtype="https://schema.org/Person">
  <span itemprop="name">Ada Lovelace</span>
</div>
```

For new work, describe the thing in one JSON-LD block and drop the microdata attributes:

```html
<script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "Article", "author": { "@type": "Person", "name": "Ada Lovelace" } }
</script>
```

Microdata is not deprecated, so the move to JSON-LD is a suggestion. RDF 1.2 Concepts §1.9
treats the features of a concrete syntax as "not significant for its meaning", and Google
"recommends using JSON-LD".

## Detectability

Detectable with the selector alone. Four branches mirror the spec's three sentences:
`itemtype`, `itemref` and `itemid` without `itemscope`, plus `itemid` without `itemtype`.
An element that matches several branches reports once. The CLI, the bookmarklet and the
ESLint plugin all report; none skips, since no branch needs a source offset.

Two neighbours stay out of reach. The second half of the `itemid` sentence, a vocabulary
that does not support global identifiers, needs that vocabulary's spec. A stray `itemprop`
outside any item needs an ancestor walk.

There is no autofix. Adding `itemscope` creates an item and pulls the descendant
`itemprop`s into it, which changes the published data. Deleting `itemtype` or `itemref`
leaves the output as it was, and it also throws away the author's evident intent to
describe an item; a person makes that call.

## Resources

- [HTML Standard §5.2.2: Items](https://html.spec.whatwg.org/multipage/microdata.html#items): "An element with the itemscope attribute specified creates a new item", and the three "must not" sentences for `itemtype`, `itemref` and `itemid`.
- [MDN: itemtype](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/itemtype): the same constraints in reference form, for `itemtype` and `itemid`.
- [Google Search Central: Intro to structured data markup](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data): "Google recommends using JSON-LD".
- [W3C RDF 1.2 Concepts](https://www.w3.org/TR/rdf12-concepts/): §1.9, the features of a concrete syntax "are not significant for its meaning".
- [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/): the replacement syntax, a W3C Recommendation since 2020-07-16.
