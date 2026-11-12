---
ruleId: "meta/http-equiv-description"
title: "<meta http-equiv=\"description\">"
description: "description in http-equiv maps to nothing; move it to meta name so crawlers read it."
pubDate: "2026-09-14"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="description" i]'
fix: { op: "none" }
replacement: "Move the text to <meta name=\"description\" content=\"…\">."
tags: ["http-equiv", "search"]
impacts: ["seo"]
related: ["meta/http-equiv-robots"]
---

A `description` in `http-equiv` describes nothing. `description` is a standard metadata *name*,
whose value "must be a free-form string that describes the page", and in the `http-equiv`
attribute it is an unknown value that maps to no state.

The mix-up has a history. HTML 4.01 described `http-equiv` as an attribute that "may be used in
place of the name attribute", read by servers that would "gather information for HTTP response
message headers". Authors took the two attributes as interchangeable and wrote any name in
either. The HTML Standard separated them: `name` carries document metadata, and `http-equiv`
accepts a closed list of pragma keywords, of which `description` is not one.

## Why avoid

This is a mistake with a cost. Google builds result snippets from page content and "sometimes
uses the meta description HTML element if it might give users a more accurate description of the
page than content taken directly from the page". The http-equiv spelling never feeds snippets:
Google reads the description from `<meta name="description">`, and a crawler that reads names
never sees this tag. Every such tag is a missing snippet pitch, and prevalence data finds
thousands of them.

The page then has no description at all, unless a correct tag sits beside the wrong one. Google
writes the snippet from body text alone, and any other tool that reads the description finds
nothing.

The cost is a lost opportunity, not a broken page: nothing else reads the tag either. That is
why the severity is `unnecessary`.

## Use instead

Move the text to the `name` attribute, and check it while you move it:

```html
<!-- Before: an http-equiv value with no meaning -->
<meta http-equiv="description" content="A page about sewing supplies.">

<!-- After -->
<meta name="description" content="Get everything you need to sew your next garment. Open Monday-Friday 8-5pm, located in the Fashion District.">
```

Google's best practices for the text: write it for each page, describe that page, and avoid a
string of keywords. A page that already has a `<meta name="description">` can delete the
http-equiv copy, or fold anything worth keeping into the real one: `head/description-multiple`
reports a second `name` tag.

## Detectability

Detectable with one selector: one element, one attribute value, matched without regard to ASCII
case. The CLI, the bookmarklet and the ESLint plugin report the same findings, and none skips.
There is no autofix: moving the text to the `name` attribute is a rename, and the author should
confirm the copy while moving it, since a page can carry both tags with different text.

## Resources

- [HTML Standard: Pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives): description is not a pragma keyword, so the http-equiv spelling maps to no state.
- [HTML Standard: standard metadata names](https://html.spec.whatwg.org/multipage/semantics.html#meta-description): `description` "must be a free-form string that describes the page".
- [HTML 4.01: the META element](https://www.w3.org/TR/html401/struct/global.html#edef-META): `http-equiv` "may be used in place of the name attribute", for servers to "gather information for HTTP response message headers".
- [Google Search Central: Control your snippets](https://developers.google.com/search/docs/appearance/snippet): snippets come from page content and sometimes the `<meta name="description">` tag, with best practices for writing it.
