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

`<meta name="title">` repeats the document title for nobody. The WHATWG registry never registered the bare name, and the title pipeline never reads it. Most instances copy `<title>`; the rest state a title nothing reads.

## Why avoid

The name is unregistered. The MetaExtensions registry lists `dc.title`, `citation_title` and vendor variants, with no bare `title` in the list. An unregistered name conforms, yet no consumer assigns it meaning.

Search engines ignore it. Title links come from `<title>`, headings, `og:title` and prominent text. The guide mandates a `<title>` per page and never mentions the meta copy.

The copy drifts. Twenty major sites carry the tag, each echoing `<title>` today. The next edit updates one text and misses the other, leaving two titles with no reader able to say which one counts.

## Use instead

Delete the tag. Keep the title in `<title>` alone:

```html
<title>ExampleSocialSite: Sign up for a new account.</title>
```

## Detectability

Detectable with the selector alone. The branch pins the `title` name with `=`, since `name` holds a single value, and the `i` flag folds case. The `Title` and `TITLE` spellings seen in the wild trip the rule; every other name stays quiet. A `class="swiftype"` tag stays quiet: Swiftype site search reads its own `title` field from it.

The fix removes the element. Removal takes nothing working with it: no consumer reads the tag, so deletion leaves `<title>` as the single title.

## Resources

- [Swiftype: meta tags](https://swiftype.com/documentation/site-search/crawler-configuration/meta-tags): the crawler reads `<meta class="swiftype" name="title" data-type="string">`.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): the extension registry for `meta` names; no bare `title` row exists among extensions, proposals, or failed proposals.
- [Google Search Central: influencing title links](https://developers.google.com/search/docs/appearance/title-link): the title-source list omits `meta name=title`, and best practices mandate a `<title>` per page.
