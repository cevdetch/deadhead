---
ruleId: "attr/table-datapagesize"
title: "<table datapagesize>"
description: "datapagesize on table is unnecessary; omit it altogether."
pubDate: "2026-09-21"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "table[datapagesize]"
fix: { op: "remove-attribute", attr: "datapagesize" }
replacement: "Delete the attribute: <table><tr><td>Cell</td></tr></table>."
tags: ["tables"]
impacts: ["maintainability"]
related: ["attr/table-presentational"]
---

`datapagesize` on `table` decides nothing. The HTML Standard calls the attribute unnecessary,
with one direction: omit it altogether. The table renders all its rows with or without it.

The attribute never had a standard meaning. HTML 4.01's DTD lists it on `TABLE` as "reserved for
possible future use", alongside the `datasrc`, `datafld` and `dataformatas` attributes it was
meant to work with: a table bound to an external data source would show that many records per
page. The binding never became part of HTML (see `attr/data-binding`), and the paging went with
it.

## Why avoid

The HTML Standard's list of non-conforming features names `datapagesize` on `table` elements:
"Unnecessary. Omit it altogether." The standard maps `cellpadding`, `cellspacing`, `width`,
border widths and alignment on tables to presentational hints, and `datapagesize` appears in
none of those mappings. The `HTMLTableElement` partial interface for obsolete attributes carries
`align`, `border`, `frame`, `rules`, `summary`, `width`, `bgColor`, `cellPadding` and
`cellSpacing`, and no `datapagesize` member. The W3C HTML5 Recommendation printed the same line.

A `datapagesize="20"` asks for pagination no browser performs. A reader who sees it can expect a
table that shows 20 rows at a time and finds every row on the page instead.

## Use instead

Delete the attribute. If the table is long enough to need pages, paginate where the data comes
from, and link the pages:

```html
<!-- Before -->
<table datapagesize="20">
  <tr><td>Basic</td><td>CHF 9</td></tr>
</table>

<!-- After -->
<table>
  <tr><td>Basic</td><td>CHF 9</td></tr>
</table>
<nav aria-label="Pages">
  <a href="?page=2">Next page</a>
</nav>
```

Server-side pages keep every row reachable without script and give each page its own URL. Paging
in script works too, as long as the full data stays reachable for readers without it.

## Detectability

Detectable with one selector: `table[datapagesize]`. Presence of the attribute is the whole
verdict, so no logic module exists. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. The autofix removes the attribute, which no browser reads, so the
table renders as before. Tables live in `body`, so the scope confines the walk to that half.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `datapagesize` on `table` elements, "Unnecessary. Omit it altogether."
- [HTML Standard: other elements, attributes and APIs](https://html.spec.whatwg.org/multipage/obsolete.html#other-elements,-attributes-and-apis): the `HTMLTableElement` partial interface, with nine reflected members and no `datapagesize`.
- [HTML 4.01: strict DTD](https://www.w3.org/TR/html401/sgml/dtd.html): `datapagesize` on `TABLE`, "reserved for possible future use".
- [W3C HTML5: obsolete features](https://www.w3.org/TR/2014/REC-html5-20141028/obsolete.html#non-conforming-features): `datapagesize` on `table` is unnecessary.
