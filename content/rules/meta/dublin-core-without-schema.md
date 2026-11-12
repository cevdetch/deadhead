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

A `DC.*` or `DCTERMS.*` meta name without its `schema.*` declaration binds to no URI. A
processor that follows the Dublin Core in HTML conventions cannot tell which vocabulary the name
belongs to, so the metadata the author meant to publish is not Dublin Core to it.

Dublin Core is a metadata vocabulary used by libraries, archives and repositories: title,
creator, date, subject and the like. DCMI's 2008 specification for HTML, DC-HTML, writes each
property as a prefixed `name` such as `DC.title`, and binds the prefix to a namespace with a
`<link rel="schema.DC">` whose `href` is the vocabulary's URI. The `link` is what turns
`DC.title` into `http://purl.org/dc/elements/1.1/title`.

## Why avoid

DC-HTML: "If the prefix used in a DC-HTML Prefixed Name has not been associated with a URI in a
namespace declaration, no URI can be generated for that DC-HTML Prefixed Name." The
specification is explicit that the familiar prefixes get no exemption: "the "DC" and "DCTERMS"
prefixes are not subject to any special treatment; there are no "built-in" namespace
declarations."

The WHATWG keyword registry repeats the requirement on its DC entries: each one has to travel
with its schema link.

Consumers differ in how strict they are, which makes the gap easy to miss. Google Scholar reads
tags such as `DC.title` by name and documents no schema link, and treats Dublin Core as "a last
resort" behind its own `citation_*` tags. A harvester or converter that follows DC-HTML, such as
the GRDDL transformation to RDF the specification publishes, generates no property for the
unbound names. A page can work in one reader and publish no metadata to another.

Prefix matching forgives case and nothing else. DC-HTML: "the matching of the prefix ... is not
case-sensitive", so a lowercase `dc.title` binds under an uppercase `schema.DC` declaration, and
under nothing at all without one.

## Use instead

Declare the namespace beside the names it binds, one `link` per prefix in use:

```html
<!-- Before: neither name binds to a URI -->
<meta name="DC.title" content="How to deadhead roses">
<meta name="DCTERMS.modified" content="2026-09-21">

<!-- After -->
<link rel="schema.DC" href="http://purl.org/dc/elements/1.1/">
<link rel="schema.DCTERMS" href="http://purl.org/dc/terms/">
<meta name="DC.title" content="How to deadhead roses">
<meta name="DCTERMS.modified" content="2026-09-21">
```

Keep the namespace URIs as DCMI publishes them, with `http://` and the trailing slash: they are
identifiers, and a changed string is a different namespace. A site that has no catalogue or
repository reading its Dublin Core can delete the names instead: search engines do not use them.

## Detectability

Unpairable by selector, which is why this is a `kind: "document"` rule: no selector can pair
`meta` names with `link` declarations. The logic in
`packages/rules/logic/meta/dublin-core-without-schema.ts` collects declared prefixes from
`schema.` rel tokens carrying `href`, then reports each `DC.*` or `DCTERMS.*` name with no
declaration. The check reads attributes, never source offsets, so the CLI, the bookmarklet and
the ESLint plugin report the same findings. A `schema.` link without `href` binds nothing and
does not count.

A fragment, a file with no doctype and no `<html>` tag, is not checked: the `schema.DC` link can
sit in another partial of the same page. Other prefixes share the problem and stay out of scope.
There is no autofix: adding the declaration adds text, and the author can choose to delete the
names instead.

## Resources

- [DCMI: expressing Dublin Core in HTML meta/link](https://www.dublincore.org/specifications/dublin-core/dc-html/): "no URI can be generated" for an undeclared prefix, "there are no "built-in" namespace declarations", and case-insensitive prefix matching.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): every DC entry carries the accompaniment requirement.
- [Google Scholar: inclusion guidelines](https://scholar.google.com/intl/en/scholar/inclusion.html): Dublin Core tags such as `DC.title` "as a last resort", behind `citation_*` tags.
