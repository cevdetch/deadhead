---
ruleId: "head/base-multiple"
title: "more than one base element"
description: "Only the first base href and target count; a second base with another URL misleads every edit to the page's links."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Fold the first href and the first target onto a single base: <base target=\"_top\" href=\"https://example.com/\">. Delete the rest."
tags: ["one-per-page"]
impacts: ["interop", "maintainability"]
related: ["document/html-lang"]
---

A document holds at most one `base` element. Each element past the first trips this rule.

`<base>` carries two settings for the whole page. `href` sets the base URL that every relative
URL resolves against, and `target` sets where links and forms open when they name no target of
their own. A second `<base>` can come from a second author: a framework's index file that ships
`<base href="/">`, and a CMS, proxy or plugin that adds its own, such as a
`<base target="_blank">` meant to open every link in a new tab.

## Why avoid

The HTML Standard caps the count: "There must be no more than one base element per document."
Then it says which extras lose: "If there are multiple base elements with href attributes, all
but the first are ignored", and the same for `target`. The document base URL is the frozen base
URL of "the first base element in tree order with an href content attribute", and a hyperlink's
default target comes from the first `<base>` with a `target`.

The ignore rule splits by attribute. The first `href` wins its race and the first `target` wins
its own, even when they sit on different elements. With these two tags:

```html
<base href="https://example.com/news/">
<base target="_top" href="https://example.com/archive/">
```

relative URLs resolve against `/news/`, and links open in `_top`. Each tag is half live and half
dead, and nothing in the markup says which half.

That split makes extras treacherous. An editor deleting the "duplicate" second tag drops the
live `target`, and links that opened in the top frame start opening in place. An editor changing
the second `href` to move the site's assets edits a value nothing reads, and the change appears
to do nothing. Moving the tags around changes which one wins, so a template that reorders the
head changes how every relative URL on the page resolves.

The stakes are page-wide. A lone `base` sets every relative URL and every default navigation
target in the document, including fragment links such as `href="#top"`. Two of them make that
setting depend on source order.

## Use instead

Fold the first `href` and the first `target` onto a single element, at the top of the head, and
delete the rest:

```html
<head>
  <meta charset="utf-8">
  <base target="_top" href="https://example.com/news/">
  <title>News</title>
</head>
```

Then remove the source of the second one. A framework that relies on `<base href>` keeps the one
in its index file; a plugin or CMS setting that adds another can be turned off. To open specific
links in a new tab, put `target="_blank"` on those links, not on a second `<base>`.

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector can
count to two. The logic in `packages/rules/logic/head/base-multiple.ts` lists the `base`
elements once and reports each one past the first. The CLI, the bookmarklet and the ESLint
plugin report the same findings, and none skips. A `<base>` with neither attribute counts too:
the standard requires one of them. There is no autofix: the first `href` and the first `target`
can sit on different elements, so merging them is a decision for a person. `head/base-position`
covers a single `<base>` that comes too late.

## Resources

- [HTML Standard: the base element](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element): "There must be no more than one base element per document"; all-but-first `href` and `target` ignored as separate races; the default target taken from a `<base>` with `target`.
- [HTML Standard: document base URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#document-base-url): the frozen base URL of the first `<base>` with `href` in tree order.
- [MDN: `<base>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/base): a single `base` in a document, first `href` and first `target` obeyed, plus the fragment-anchor resolution gotcha.
