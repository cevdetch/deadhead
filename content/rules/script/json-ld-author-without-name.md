---
ruleId: "script/json-ld-author-without-name"
title: "<script> JSON-LD author, creator or publisher with no name"
description: "A JSON-LD author, creator or publisher given as a bare @id credits nobody: Google reads one page and finds no name there."
pubDate: "2026-11-14"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Write the credit out on the page: {\"@type\": \"Person\", \"@id\": \"https://example.com/#person\", \"name\": \"Jane Doe\", \"url\": \"https://example.com/\"}. Keep the @id so the nodes still join."
tags: ["search", "structured-data"]
impacts: ["seo"]
related: ["script/json-ld-required-properties", "script/json-ld-syntax"]
---

A JSON-LD `author` written as `{"@id": "https://example.com/#person"}` names a node and says
nothing about it. Sites that run several domains for one person or one company use the
pattern to point every page at a single node defined on the main site. Google does not follow
the pointer: it reads the page in front of it, and on that page the author has no name.

## Why avoid

Google's article documentation lists `author.name`, "The name of the author", among the
properties it reads for an article, and its author markup best practices ask for `@type` and
`url` beside it: "we strongly recommend using the type and url (or sameAs) properties". A
reference with no name gives Google none of the three. The same holds for `creator` and
`publisher`, which credit a person or an organization the same way.

The node the reference points to does not reach Google from another page. Google's general
structured data guidelines say to "Put the structured data on the page that it describes",
and JSON-LD 1.1 defines a node reference as "a node object containing only the @id property,
which may represent a reference to a node object found elsewhere in the document". The
document is the page. A node on the main site is a different document, so on this page the
credit resolves to nothing.

The markup breaks nothing else. The article stays eligible for its rich result, since Google
lists no required properties for `Article`, which is why the severity is `unnecessary`, the
lowest, the same call as `meta/og-required-properties` makes for a card without its picture.
The reference is dead weight as written: it costs the credit the author meant to give.

## Use instead

Repeat the name and the URL on every page that credits the person, and keep the `@id` so a
consumer that merges pages still sees one node:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Notes on head markup",
  "datePublished": "2026-11-14T00:00:00Z",
  "author": {
    "@type": "Person",
    "@id": "https://example.com/#person",
    "name": "Jane Doe",
    "url": "https://example.com/"
  }
}
</script>
```

A page that defines the full node once, in any of its JSON-LD blocks, can point to it from
the others: the rule resolves an `@id` against every block on the page.

## Detectability

Detectable. The document rule in
`packages/rules/logic/script/json-ld-author-without-name.ts` parses every
`script[type="application/ld+json"]` on the page and walks each object and array, `@graph`
included. It reports a block whose `author`, `creator` or `publisher` holds an object with an
`@id` and no `name`, when no node on the page with that `@id` carries a name. Property names
match bare, `schema:`-prefixed or as the full schema.org IRI. The detail names each property
and `@id`. The CLI, the bookmarklet and the ESLint plugin all report; none skips, since the
check reads script text and no source offset.

A fragment returns nothing: the layout that assembles the page can hold the named node.
`@id`s compare as written, so `#person` and `https://example.com/#person` count as two nodes.
A credit with no `@id`, a plain string, or a node defined in Microdata or RDFa is out of
scope, and a block that fails `JSON.parse` is `script/json-ld-syntax`'s finding.

There is no autofix. The name belongs to the author's data, and no fix op adds text.

## Resources

- [Google Search Central: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article): `author.name`, "The name of the author", and the author markup best practices: "we strongly recommend using the type and url (or sameAs) properties".
- [Google Search Central: General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): "Put the structured data on the page that it describes, unless specified otherwise by the documentation."
- [W3C: JSON-LD 1.1, node references](https://www.w3.org/TR/json-ld11/#dfn-node-reference): a node object with `@id` alone "may represent a reference to a node object found elsewhere in the document".
- [Google Search Central: Profile page structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page): Google's own `@id` example links an article's `author` to a `mainEntity` defined in the same markup, with its name.
