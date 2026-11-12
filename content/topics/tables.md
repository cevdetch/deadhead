---
description: "Table attributes from before CSS, the summary attribute nobody sees, and the header markup that replaced them, with the five rules that report them."
---

Tables carry more leftover markup than most elements, because for years they were the
page layout. `<table width="100%" border="0" cellpadding="4" cellspacing="0">` and
`<td align="center" bgcolor="#ffffff" nowrap>` set sizes, spacing, colour and wrapping
before CSS could. The HTML Standard now lists those attributes as
[obsolete](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features).
Browsers still apply them, as presentational hints that any CSS rule overrides, so they
keep working until a stylesheet quietly beats them.

The other half of this topic is accessibility. `summary` on `<table>` described the table
for screen readers, but no browser shows it, so sighted readers never got the description.
A [`<caption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/caption)
reaches everyone. Header cells are marked with `<th>`, and `scope` on a `<th>` says whether
it heads a row or a column; `abbr`, `axis` and `scope` on the wrong cells say nothing.

Deadhead reports five, all deprecated:

- [`attr/table-presentational`](/rules/attr/table-presentational) and
  [`attr/table-part-presentational`](/rules/attr/table-part-presentational): the
  presentational attributes on `<table>` and on its rows, cells, columns and caption. No
  autofix, because deleting them changes the rendering until CSS takes over.
- [`attr/table-summary`](/rules/attr/table-summary): `summary`. Move the text into a
  `<caption>`, or into a paragraph the table points to.
- [`attr/td-abbr-axis-scope`](/rules/attr/td-abbr-axis-scope): header attributes on cells
  that cannot carry them.
- [`attr/table-datapagesize`](/rules/attr/table-datapagesize): a hint nothing read. The fix
  deletes it.

The [presentational markup](/topics/presentational) topic covers the same pattern on other
elements.
