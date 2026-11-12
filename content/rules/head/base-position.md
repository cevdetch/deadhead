---
ruleId: "head/base-position"
title: "<base> after other head elements"
description: "Elements before <base> resolve their URLs against the page address, so relative links break; put <base> at the top of <head>."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "head"
match: "logic"
fix: { op: "none" }
replacement: "Move <base> to the top of <head>, after <meta charset> and the viewport tag and before any link, script or style."
tags: ["one-per-page"]
impacts: ["interop"]
related: ["head/base-multiple", "head/charset-position"]
---

A `<base>` that comes after other head elements is too late for them. Elements parsed before it
resolve their URLs against the page address, so a relative stylesheet, script or icon above
`<base>` loads from the wrong place.

`<base href>` sets the document base URL, the address every relative URL in the page resolves
against: `href`, `src`, `action`, and fragment links such as `#top`. The parser builds the page
in source order and starts fetches as it goes, so the base URL in force for an element is the
one known when the browser reads it.

## Why avoid

The HTML Standard: "A base element, if it has an href attribute, must come before any other
elements in the tree that have attributes defined as taking URLs." The parser fetches a
`<link rel="stylesheet" href="css/site.css">` when it reaches it, before a later `<base>` has
set the base URL.

The late `<base>` does not repair what came before it. The standard has a note on base URL
changes: they do not affect "the image displayed by img elements", and "subsequent accesses of
the src IDL attribute from script will return a new absolute URL that might no longer correspond
to the image being shown". The same holds for a stylesheet or script already fetched. On a page
at `https://example.com/guide/` with `<base href="https://example.com/docs/">` below the
stylesheet link, the browser requests `/guide/css/site.css`, as Chrome 156 and Firefox 161 both
did in a probe on 2026-11-12. Read in the console afterwards, `link.href` returns
`https://example.com/docs/css/site.css`, a URL that was never requested. The page can load
unstyled, with a 404 in the network panel, while the markup reads as correct.

capo.js puts `<base>` in its top group with `<meta charset>`, `<meta http-equiv>` and
`<meta name=viewport>`: "To avoid any broken links for resources loaded early in the document,
capo.js recommends placing the `<base>` element in the top position."

## Use instead

Place `<base>` at the top of `<head>`, after `<meta charset>` and the viewport tag and before
any element that carries a URL:

```html
<!-- Before: site.css resolves against the page address -->
<head>
  <meta charset="utf-8">
  <title>Guide</title>
  <link rel="stylesheet" href="css/site.css">
  <base href="https://example.com/docs/">
</head>

<!-- After -->
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="https://example.com/docs/">
  <title>Guide</title>
  <link rel="stylesheet" href="css/site.css">
</head>
```

`<base>` changes the meaning of every relative URL in the page, including `href="#section"`,
which resolves against the base URL and navigates away from the page when the two differ. If the
page needs `<base>` only to shorten a few paths, absolute or root-relative URLs, such as
`/docs/css/site.css`, remove the dependency on its position. A page that keeps `<base>` has one,
at the top: `head/base-multiple` covers the second.

## Detectability

The logic in `packages/rules/logic/head/base-position.ts` reports a `<base>` when a head element
outside the capo.js top group comes before it, and names the first one in the detail. The CLI,
the bookmarklet and the ESLint plugin report the same findings, and none skips. A `<title>` or
`<meta name="description">` there breaks no URL, and the rule still reports it, as capo.js does.
A `<base>` at a fragment's top level stays quiet, and so does one without `href`: it resolves no
URL. A `<base target>` alone has a placement rule of its own in the standard, before any
hyperlink, which this rule does not check. There is no autofix: the fix moves an element.

## Resources

- [HTML Standard: the base element](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element): `<base href>` comes before every element with a URL attribute; "If there are multiple base elements with href attributes, all but the first are ignored."
- [HTML Standard: document base URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#document-base-url): the frozen base URL of the first `<base href>`, and the note that a base URL change "doesn't affect, for example, the image displayed by img elements".
- [capo.js: rules](https://rviscomi.github.io/capo.js/user/rules/#base): the "Pragma directives" group and `<base>` "in the top position".
- [MDN: `<base>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/base): one `<base>` per document, its effect on relative URLs, and in-page anchors resolving against it.
