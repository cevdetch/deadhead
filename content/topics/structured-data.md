---
description: "Machine-readable metadata in the head: JSON-LD that breaks or earns nothing, retired vocabularies, and microdata and Dublin Core that bind to nothing."
---

Structured data describes a page to software: what kind of thing it is, who wrote it, what
it sells or when an event starts. Most sites write it as JSON-LD in a
`<script type="application/ld+json">` block using the [schema.org](https://schema.org/)
vocabulary, which search engines read for rich results. Older pages carry microdata
attributes, RDFa prefixes, Dublin Core `<meta>` names and a `profile` on `<head>`.

The browser never runs or renders a data block, so mistakes stay invisible. One stray comma
makes the whole JSON-LD block unparseable, and a search engine discards all of it. A
serializer that leaves `</` unescaped lets a value containing `</script>` end the block
early and turn the rest of the value into markup. Other markup is valid but has no reader
left: Google retired the data-vocabulary.org vocabulary in 2020, stopped showing the
sitelinks search box that `SearchAction` fed in November 2024, and retired the HowTo, FAQ
and COVID announcement displays.

Deadhead reports ten:

- [`script/json-ld-syntax`](/rules/script/json-ld-syntax) and
  [`script/json-ld-unescaped-lt`](/rules/script/json-ld-unescaped-lt): broken JSON, and a
  literal `</` that shows the serializer does not escape. Both harmful.
- [`script/json-ld-search-action`](/rules/script/json-ld-search-action),
  [`script/json-ld-howto-faq-announcement`](/rules/script/json-ld-howto-faq-announcement)
  and [`attr/data-vocabulary`](/rules/attr/data-vocabulary): markup for displays Google no
  longer draws. HowTo and FAQ are still valid schema.org, so keep them if another consumer
  reads them.
- [`attr/microdata-without-itemscope`](/rules/attr/microdata-without-itemscope) and
  [`meta/dublin-core-without-schema`](/rules/meta/dublin-core-without-schema): metadata that
  binds to no item or vocabulary, so readers skip it.
- [`attr/head-profile`](/rules/attr/head-profile),
  [`attr/meta-scheme`](/rules/attr/meta-scheme) and
  [`attr/xmlns-prefix`](/rules/attr/xmlns-prefix): HTML 4 and XHTML-era qualifiers the HTML
  parser does not read.

Google's [search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
lists the structured data features it still shows.
