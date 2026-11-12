---
ruleId: "meta/title"
title: "<meta name=\"title\">"
description: "A meta title duplicating the document title that no engine reads."
pubDate: "2026-09-22"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="title" i]:not([class~="swiftype" i])'
fix: { op: "remove-element" }
replacement: "Delete the tag. The document title lives in <title>: <title>ExampleSocialSite: Sign up for a new account.</title>."
tags: ["search"]
impacts: ["seo", "maintainability"]
related: ["meta/page-info-names", "meta/keywords"]
---

`<meta name="title">` repeats the document title for nobody. The WHATWG registry never
registered the bare name, and the title pipeline never reads it. Most instances copy `<title>`;
the rest state a title nothing reads.

One source of the tag is a term. SEO tools and CMS fields call the `<title>` element the "meta
title", next to the meta description, and a template that prints every SEO field as a `meta`
element turns the label into markup. The page then carries the same text twice, once where
browsers and search engines look, and once where nothing does.

## Why avoid

The name is unregistered. The MetaExtensions registry lists `dc.title`, `citation_title` and
vendor variants, with no bare `title` in the list. An unregistered name conforms, yet no
consumer assigns it meaning.

Search engines ignore it. Google lists where its title links come from: the `<title>` element,
the main visual title, headings, `og:title`, prominent text, anchor text and `WebSite`
structured data. Its best practices start with "Make sure every page on your site has a title
specified in the `<title>` element" and never mention the meta copy. Browsers take the tab title
from `<title>` alone.

The copy drifts. Twenty major sites carry the tag, each echoing `<title>` today. The next edit
updates one text and misses the other, leaving two titles with no reader able to say which one
counts. A tag whose text differs from `<title>` hints at an intent that never took effect: a
shorter title for sharing, or a title for one specific consumer.

## Use instead

Delete the tag. Keep the title in `<title>` alone:

```html
<!-- Before -->
<title>Widget store</title>
<meta name="title" content="Widget store">

<!-- After -->
<title>Widget store</title>
```

Where the tag held a different title on purpose, give it to the consumer that reads one. Social
previews read `<meta property="og:title">`. Google Scholar reads `citation_title` or `DC.title`
on scholarly articles, and its guidelines require that tag to "contain the title of the paper".
A site search crawler with its own schema, such as Swiftype's, keeps its tagged form. In a CMS,
map the "meta title" field to the `<title>` element and drop the extra output.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. The branch pins the `title` name with `=`, since `name` holds a
single value, and the `i` flag folds case. The `Title` and `TITLE` spellings seen in the wild
trip the rule; every other name stays quiet, `dc.title` and `citation_title` included. A
`class="swiftype"` tag stays quiet: Swiftype site search reads its own `title` field from it.

The fix removes the element. Removal takes nothing working with it: no consumer reads the tag,
so deletion leaves `<title>` as the single title.

## Resources

- [Swiftype: meta tags](https://swiftype.com/documentation/site-search/crawler-configuration/meta-tags): the crawler reads `<meta class="swiftype" name="title" data-type="string">`.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): the extension registry for `meta` names; no bare `title` row exists among extensions, proposals, or failed proposals.
- [Google Search Central: influencing title links](https://developers.google.com/search/docs/appearance/title-link): the title-source list omits `meta name=title`, and best practices start with a `<title>` per page.
- [Google Scholar: inclusion guidelines](https://scholar.google.com/intl/en/scholar/inclusion.html): `citation_title` or `DC.title` for the title of a paper.
