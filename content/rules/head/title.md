---
ruleId: "head/title"
title: "head with zero, duplicate or empty title"
description: "A document with no title, two titles, or a blank title leaves tabs, search results and screen readers with nothing to announce."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Give the document a single descriptive title: <title>How to deadhead roses - Garden Notes</title>. Put the page purpose first, then the site name."
tags: ["one-per-page"]
impacts: ["a11y", "seo"]
related: ["document/html-lang"]
---

A document needs a single non-empty `title`. Zero titles, two titles and blank titles each trip
this rule.

The `<title>` is the page's name outside the page. The browser shows it in the tab, the window
title, the history list and a new bookmark; screen readers read it when the page loads; and
search engines start their result heading from it. The HTML Standard asks for a title that
identifies the document "even when they are used out of context, for example in a user's history
or bookmarks, or in search results".

## Why avoid

The head model wants a title in most documents, and the standard is plain about the count:
"There must be no more than one title element per document." It is a conformance rule, not
guidance.

Without a title, each of those surfaces falls back to something worse. The tab shows the URL or
the file name, the bookmark takes the same, and a list of open tabs becomes a list of addresses.
Screen-reader users lose the page announcement they navigate by, which WCAG 2.4.2 requires at
Level A: "Web pages have titles that describe topic or purpose." The Understanding document
notes that people with visual disabilities rely on the title to "differentiate content when
multiple web pages are open". Google writes the result heading from other text on the page, such
as the main heading, `og:title` or anchor text pointing at the page, so the heading a searcher
sees is one the author did not choose.

A duplicate is non-conforming, and only one copy counts. The document's title "is the first
title element in the document (in tree order)": the tab shows it, and `document.title` reads and
writes it. Edits to a later copy change nothing in the browser, and Google's John Mueller has
said a second title tag brings no bonus. Two titles can come from two layers of a stack each
printing one, as duplicate descriptions do.

A blank title passes the count and fails the purpose. An empty string, or one made of spaces,
names nothing and announces nothing, and the browser falls back as if the element were absent.

## Use instead

Write one descriptive title per page, purpose first, with the site name after a delimiter:

```html
<!-- Before: a layout title and a page title, and the layout's comes first -->
<title>Garden Notes</title>
<title>How to deadhead roses</title>

<!-- After -->
<title>How to deadhead roses - Garden Notes</title>
```

Google's advice for the element matches: "Make sure every page on your site has a title
specified in the `<title>` element", with "distinct text that describes the content of the page"
on each page, no vague titles such as "Home" or "Profile", and the site name "separated from the
rest of the text with a delimiter such as a hyphen, colon, or pipe". Put the words that tell
this page apart from its neighbours first, since tabs and results cut titles from the end.

In a framework, set the title in one place. A layout that prints a default should let the page
replace it, not add a second element. A title set only from script reaches readers that run the
script; the served HTML still has none, and this rule reads the served HTML.

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector can
count to two. The logic in `packages/rules/logic/head/title.ts` lists the `title` elements once:
no titles reports the `head`, each title past the first reports itself, and a whitespace-only
title reports itself. The check reads text, never source offsets, so the CLI, the bookmarklet
and the ESLint plugin report the same findings.

A `title` inside `<svg>` is not counted. The HTML parser makes it SVG's own `title`, the
accessible name of a drawing, and the rule tells the two apart by an `<svg>` ancestor.

On a fragment, a file with no doctype and no `<html>` tag such as a layout partial, a missing
title is not reported: another file supplies it. Duplicate and empty titles in a fragment still
are. There is no autofix: the right title is the author's to write.

## Resources

- [WHATWG HTML: the title element](https://html.spec.whatwg.org/multipage/semantics.html#the-title-element): "There must be no more than one title element per document", and titles that work "out of context"; the head element's content model requires one in most documents.
- [WHATWG HTML: `document.title`](https://html.spec.whatwg.org/multipage/dom.html#document.title): "The title element of a document is the first title element in the document (in tree order)".
- [MDN: `<title>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title): tab text, search results, the one-title rule, and screen-reader announcement of the title.
- [WCAG 2.2: 2.4.2 Page Titled](https://www.w3.org/TR/WCAG22/#page-titled): Level A, "Web pages have titles that describe topic or purpose"; the [Understanding document](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html) on telling open pages apart.
- [Google Search Central: influencing title links](https://developers.google.com/search/docs/appearance/title-link): the `<title>` element as the first source, the other sources Google uses, and the best practices quoted above.
- [Search Engine Journal: Google on extra meta descriptions and title tags (2020)](https://www.searchenginejournal.com/google-on-how-it-handles-extra-meta-descriptions-and-title-tags/368600/): Mueller, "It's not that there's any kind of a bonus attached to making a second title tag."
