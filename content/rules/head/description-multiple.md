---
ruleId: "head/description-multiple"
title: "more than one <meta name=\"description\">"
description: "The HTML Standard allows one description per page; Google merges extras into one, so the snippet text is no longer the one you wrote."
pubDate: "2026-10-01"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "head"
match: "logic"
fix: { op: "none" }
replacement: "Keep one <meta name=\"description\"> and fold anything worth keeping from the others into it."
tags: ["one-per-page", "search"]
impacts: ["seo"]
related: ["head/canonical-multiple", "head/title"]
---

A page with more than one `<meta name="description">` breaks an HTML Standard requirement and
gains nothing. Google treats a second description as an extension of the first, so when it uses
the description for a snippet, the text is one no single tag says.

## Why avoid

The HTML Standard: "There must not be more than one meta element where the name attribute value
is an ASCII case-insensitive match for description per document." Asked whether a second
description helps, Google's John Mueller answered: "we will treat that the same as if you just
extend the existing meta tag on the page." The extra tag brings no reach, and the merged text is
one Google assembled.

## Use instead

```html
<meta name="description" content="How and when to deadhead roses, with photos of each cut.">
```

## Detectability

The logic in `packages/rules/logic/head/description-multiple.ts` counts the descriptions in the
document and reports each one past the first, as `head/manifest-multiple` does. There is no
autofix: Google merges the tags, so which words stay is the author's call.

## Resources

- [HTML Standard: description](https://html.spec.whatwg.org/multipage/semantics.html#meta-description): one `description` per document.
- [Search Engine Journal: Google on extra meta descriptions (2020)](https://www.searchenginejournal.com/google-on-how-it-handles-extra-meta-descriptions-and-title-tags/368600/): Mueller, "we will treat that the same as if you just extend the existing meta tag".
- [Google Search Central: Control your snippets](https://developers.google.com/search/docs/appearance/snippet): Google "sometimes uses the meta description" for the snippet.
