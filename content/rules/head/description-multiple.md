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

The second tag can come from a second layer of the stack: a theme or base layout that prints a
site-wide description, and an SEO plugin or page component that prints the page's own. Each
layer looks right in isolation, and only the rendered page shows both.

## Why avoid

The HTML Standard: "There must not be more than one meta element where the name attribute value
is an ASCII case-insensitive match for description per document." Asked whether a second
description helps, Google's John Mueller answered: "we will treat that the same as if you just
extend the existing meta tag on the page", and "there's no kind of bonus to using a second meta
description tag". The extra tag brings no reach, and the merged text is one Google assembled.

The merge works against the page in two ways. Google "sometimes uses the meta description" for
the snippet when it gives "a more accurate description of the page than content taken directly
from the page", and truncates the snippet "as needed, typically to fit the device width". A
generic site-wide sentence ahead of the page's own pushes the specific words towards the cut.
Google also asks for a description unique to each page; a shared default repeated on every URL
works against that, even with a unique second tag beside it.

Code that reads the tag picks one and drops the other. A script that calls
`document.querySelector('meta[name="description"]')` gets the first in source order: the generic
default, when the layout prints before the page.

## Use instead

Keep one description per page, written for that page, and fold anything worth keeping from the
others into it:

```html
<!-- Before: a layout default and a page description -->
<meta name="description" content="Rose care tips for every season.">
<meta name="description" content="How and when to deadhead roses, with photos of each cut.">

<!-- After -->
<meta name="description" content="How and when to deadhead roses, with photos of each cut.">
```

Fix it where the tags are generated. A layout that prints a fallback description should print it
only when the page supplies none, so that a page value replaces the default. Where a theme and
an SEO plugin both emit the tag, turn one of them off. `og:description` and
`twitter:description` are separate names and stay.

## Detectability

The logic in `packages/rules/logic/head/description-multiple.ts` counts the descriptions in the
document and reports each one past the first, as `head/manifest-multiple` does. The CLI, the
bookmarklet and the ESLint plugin report the same findings, and none skips. The name matches
without regard to ASCII case, as the standard requires, so `name="Description"` counts. The Nu
HTML Checker reports the same error for the lowercase name alone. A tag with an empty `content`
still counts. There is no autofix: Google merges the tags, so which words stay is the author's
call.

## Resources

- [HTML Standard: description](https://html.spec.whatwg.org/multipage/semantics.html#meta-description): one `description` per document, matched ASCII case-insensitively.
- [Search Engine Journal: Google on extra meta descriptions (2020)](https://www.searchenginejournal.com/google-on-how-it-handles-extra-meta-descriptions-and-title-tags/368600/): Mueller, "we will treat that the same as if you just extend the existing meta tag".
- [Google Search Central: Control your snippets](https://developers.google.com/search/docs/appearance/snippet): Google "sometimes uses the meta description" for the snippet, truncates it to fit, and asks for unique descriptions per page.
- [Nu HTML Checker: `Assertions.java`](https://github.com/validator/validator/blob/main/src/nu/validator/checker/schematronequiv/Assertions.java): "A document must not include more than one “meta” element with its “name” attribute set to the value “description”", checked against the lowercase name.
