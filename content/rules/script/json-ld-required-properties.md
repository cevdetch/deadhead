---
ruleId: "script/json-ld-required-properties"
title: "<script> JSON-LD item missing a Google-required property"
description: "A ProfilePage or BreadcrumbList without a property Google requires is not eligible for its rich result."
pubDate: "2026-11-14"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Add what the detail names: a mainEntity with a name on a ProfilePage; two or more ListItems with position and name, and item on all but the last, on a BreadcrumbList."
tags: ["search", "structured-data"]
impacts: ["seo"]
related: ["script/json-ld-author-without-name", "script/json-ld-syntax"]
---

Google lists required properties for each rich result it draws from structured data. An item
that lacks one is not a smaller rich result; it is none. This rule checks the two types a
personal or documentation site uses whose requirements Google states as a fixed list:
`ProfilePage` and `BreadcrumbList`.

## Why avoid

Google's general structured data guidelines are explicit: "Specify all required properties
listed in the documentation for your specific rich result type. Items that are missing
required properties are not eligible for rich results." The markup ships, costs bytes on
every page, and earns nothing.

The profile page documentation requires `mainEntity`, "The person or organization that this
profile page is about", and a `name` on that entity, "The primary way the person or
organization is identified". Its one allowance: "If the name property isn't available, you
can provide the alternateName property to fulfill this requirement."

The breadcrumb documentation requires a `BreadcrumbList` "that contains at least two
ListItems", and three properties on each `ListItem`: `position`, `name` and `item`. Two
exceptions apply: "If the breadcrumb is the last item in the breadcrumb trail, item is not
required", and "If you're using a Thing with a name instead of a URL to specify item, then
name is not required."

The severity is `harmful`, as for `script/json-ld-syntax`: in both cases the rich result the
markup was written for is lost.

## Use instead

A breadcrumb trail with every required property, the current page last and without `item`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Books", "item": "https://example.com/books" },
    { "@type": "ListItem", "position": 2, "name": "Science fiction" }
  ]
}
</script>
```

A profile page whose main entity carries its name, inline or on a node with the same `@id`
elsewhere on the page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "mainEntity": { "@type": "Person", "name": "Jane Doe", "alternateName": "janedoe" }
}
</script>
```

## Detectability

Detectable. The document rule in
`packages/rules/logic/script/json-ld-required-properties.ts` parses every
`script[type="application/ld+json"]` on the page and walks each object and array, `@graph`
included, for a node whose `@type` is, or lists, `ProfilePage` or `BreadcrumbList`. Types
and property names match bare, `schema:`-prefixed or as the full schema.org IRI. The detail
names each gap, such as `ListItem 2 has no name`. The CLI, the bookmarklet and the ESLint
plugin all report; none skips.

A `mainEntity` or `item` given as an `{"@id": …}` reference resolves against every block on
the page. On a fragment an unresolved reference stays quiet, since the layout can define the
node; the other checks hold for fragments too. The last ListItem is the one with the highest
`position`, or the last in the array when positions are not numbers. Presence is checked,
not value types.

Article, `BlogPosting` and `TechArticle` have no required properties, and the other types in
Google's gallery serve features outside this rule's scope, so they stay quiet. Microdata and
RDFa go unchecked, and a block that fails `JSON.parse` is `script/json-ld-syntax`'s finding.

There is no autofix: the missing values are the author's data.

## Resources

- [Google Search Central: General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): "Items that are missing required properties are not eligible for rich results."
- [Google Search Central: Profile page structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page): `mainEntity` required on `ProfilePage`, `name` required on the entity, with `alternateName` as the fallback.
- [Google Search Central: Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb): at least two ListItems; `item`, `name` and `position` required, with the exceptions for the last item and for a named Thing.
- [schema.org: ListItem](https://schema.org/ListItem): defines `position` and `item` on the list item that a `BreadcrumbList` holds.
