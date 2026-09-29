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

A document needs a single non-empty `title`. Zero titles, two titles and blank titles each trip this rule.

## Why avoid

The head model wants a title in most documents, and no document holds more than one. The count is a conformance rule, not guidance.

Without a title, the tab, the bookmark and the search-result heading go empty. Screen-reader users lose the page announcement they navigate by, which WCAG 2.4.2 demands as Level A.

A duplicate is non-conforming. Consumers honor one title and drop the rest unheard, so edits to the dropped ones change nothing.

A blank title passes the count and fails the purpose. An empty string names nothing, announces nothing, and ranks on nothing.

## Use instead

Write one descriptive title per page, purpose first:

```html
<title>How to deadhead roses - Garden Notes</title>
```

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector can count to two. The logic in `packages/rules/logic/head/title.ts` lists the `title` elements once: no titles reports the `head`, each title past the first reports itself, and a `whitespace-only` title reports itself. The check reads text, never source offsets, so it reports in all three adapters.

A `title` inside `<svg>` is not counted. The HTML parser makes it SVG's own `title`, the accessible name of a drawing, and the rule tells the two apart by an `<svg>` ancestor.

On a fragment, a file with no doctype and no `<html>` tag such as a layout partial, a missing title is not reported: another file supplies it. Duplicate and empty titles in a fragment still are.

## Resources

- [WHATWG HTML: the head element](https://html.spec.whatwg.org/multipage/semantics.html#the-head-element): the head model wants a title in most documents, and no document holds more than one title.
- [MDN: `<title>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title): tab text, ranking weight, the no-other-title parent rule, and screen-reader navigation by title.
- [WCAG 2.2: 2.4.2 Page Titled](https://www.w3.org/TR/WCAG22/#page-titled): Level A demand that pages carry titles describing topic or purpose.
