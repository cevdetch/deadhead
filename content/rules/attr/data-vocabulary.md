---
ruleId: "attr/data-vocabulary"
title: "[itemtype], [vocab] or [typeof] for data-vocabulary.org"
description: "Google retired the data-vocabulary.org vocabulary in 2020; its markup earns no rich result."
pubDate: "2026-09-23"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "any"
selector: '[itemtype*="data-vocabulary.org" i], [vocab*="data-vocabulary.org" i], [typeof*="data-vocabulary.org" i], [typeof~="v:Breadcrumb" i], [typeof~="v:Review-aggregate" i]'
fix: { op: "none" }
replacement: "Describe the same thing with schema.org in one JSON-LD block (BreadcrumbList for breadcrumbs, AggregateRating for review aggregates), then delete the data-vocabulary attributes."
tags: ["structured-data"]
impacts: ["seo", "maintainability"]
related: ["script/json-ld-syntax", "attr/xmlns-prefix", "attr/microdata-without-itemscope", "meta/dublin-core-without-schema"]
---

data-vocabulary.org was Google's own structured-data vocabulary, the one its Rich Snippets
read from 2009. Google adopted schema.org in 2011 and retired data-vocabulary.org in 2020.
Markup that still names it describes breadcrumbs and reviews to a reader that stopped
listening.

## Why avoid

Google announced the end on 2020-01-21: "With the increasing usage and popularity of
schema.org we decided to focus our development on a single SD scheme." The cut-off moved
from April 2020 to June and rolled out on 2020-07-06. Google's structured-data guide
states the result: "Data-vocabulary.org markup is no longer eligible for Google rich result
features."

The markup breaks nothing. Google's own notice says the pages "remain valid for all other
purposes", and the W3C RDFa initial context still binds the `v:` prefix to
`http://rdf.data-vocabulary.org/#`. That is why the severity is `unnecessary`: the
attributes parse, and no consumer that matters acts on them.

The markup survives at scale. Web Data Commons' October 2024 crawl ranks
`http://rdf.data-vocabulary.org/#Breadcrumb` as the top RDFa class, on 88,227 domains,
with the `https` spelling at rank 15 on another 1,572. Each of those breadcrumb trails
earns nothing in Google Search, and a reader of the template sees structured data that
looks live and is not.

## Use instead

Describe the page with schema.org, in one JSON-LD block. The breadcrumb trail becomes a
`BreadcrumbList`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Books", "item": "https://example.com/books" },
    { "@type": "ListItem", "position": 2, "name": "Fiction", "item": "https://example.com/books/fiction" }
  ]
}
</script>
```

A `v:Review-aggregate` becomes an `AggregateRating` inside the reviewed item. Then delete
the data-vocabulary attributes along with their `property="v:…"` and `rel="v:…"`
children.

Microdata and RDFa are not deprecated, so the move to JSON-LD is a suggestion carried with
the vocabulary fix. RDF 1.2 Concepts §1.9 says the features of a concrete syntax "are not
significant for its meaning", and Google "recommends using JSON-LD" as the format least
prone to authoring errors. A rewrite that keeps Microdata or RDFa with schema.org types
also clears this rule.

## Detectability

Detectable with the selector alone. Five branches cover the vocabulary in each syntax: a
Microdata `itemtype`, an RDFa `vocab`, a full-IRI `typeof`, and the two `v:` CURIEs that
dominate the Web Data Commons table. The CLI, the bookmarklet and the ESLint plugin all
report; none skips, since no branch needs a source offset.

The rule reports the root of each item and leaves its `property="v:…"` children alone. A
trail of three crumbs, each its own `v:Breadcrumb`, yields three findings. It does not
flag `xmlns:v`: that declaration belongs to `attr/xmlns-prefix`, and the RDFa initial
context makes it redundant. Two forms go unreported: the vocabulary bound to another
prefix through `prefix="…"`, and the rarer `v:` types such as `v:Person` and `v:Product`.

There is no autofix. The fix is a rewrite to schema.org, which adds markup, and every fix
op here subtracts. Deleting the attributes alone would strand their `v:` children and
still ship no replacement.

## Resources

- [Google Search Central Blog: Sunsetting support for data-vocabulary](https://developers.google.com/search/blog/2020/01/data-vocabulary): Dan Brickley and Moshe Samet, 2020-01-21, with the 2020-07-06 rollout note; gives the reason and says the pages "remain valid for all other purposes".
- [Google Search Central: Intro to structured data markup](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data): "Data-vocabulary.org markup is no longer eligible for Google rich result features", and "Google recommends using JSON-LD".
- [W3C RDFa 1.1 initial context](https://www.w3.org/2011/rdfa-context/rdfa-1.1): predefines `v` as `http://rdf.data-vocabulary.org/#` ("Google Rich Snippets' Vocabularies"), so `typeof="v:Breadcrumb"` resolves with no prefix declaration.
- [Web Data Commons: 2024-12 structured data statistics](https://webdatacommons.org/structureddata/2024-12/stats/stats.html): the October 2024 crawl ranks `http://rdf.data-vocabulary.org/#Breadcrumb` first among RDFa classes, on 88,227 domains.
- [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/): the replacement syntax, a W3C Recommendation since 2020-07-16.
- [W3C RDF 1.2 Concepts, §1.9](https://www.w3.org/TR/rdf12-concepts/): the features of a concrete syntax "are not significant for its meaning", so the JSON-LD rewrite loses nothing.
