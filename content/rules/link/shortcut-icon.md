---
ruleId: "link/shortcut-icon"
title: "<link rel=\"shortcut icon\">"
description: "shortcut is not a link relation; browsers already parse rel=\"shortcut icon\" as icon, so the token is inert."
pubDate: "2026-09-09"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="shortcut" i]'
fix: { op: "remove-token", attr: "rel", token: "shortcut" }
replacement: "Drop the shortcut token: <link rel=\"icon\" href=\"/favicon.ico\" sizes=\"32x32\">."
tags: ["icons"]
impacts: ["maintainability"]
related: ["link/mask-icon"]
---

The `shortcut` token does nothing. `rel="shortcut icon"` is the spelling Internet Explorer 5
introduced for the "favorites icon" in 1999, before there was a specification for any of it.
Every boilerplate of the following decade copied it, and copies survive today next to a second
`<link rel="icon">` that does the same job.

## Why avoid

`shortcut` is not a link type of its own. The HTML Standard defines `icon` and keeps `shortcut`
as a historical prefix: "For historical reasons, the icon keyword may be preceded by the keyword
"shortcut"." The `rel` attribute is a set of space-separated tokens, so a browser parsing
`shortcut icon` finds two tokens, recognises `icon`, finds no link type called `shortcut`, and
moves on. The markup that runs is `rel="icon"` either way.

The token had a reason once. Mathias Bynens' write-up records that Internet Explorer 8 and
earlier ignored a plain `rel="icon"`: without `shortcut`, IE "ignores the declaration entirely,
searches for a file called favicon.ico in the site root, and uses that instead". IE also read
the attribute as one string, so `rel="icon shortcut"` failed there too. IE9 dropped the need
when the link carried `type="image/x-icon"`. Those browsers are gone, and Microsoft ended
support for the IE 11 desktop app on certain versions of Windows 10 in June 2022. No browser in
use today needs the longer form.

What is left is a token a reader has to account for and cannot resolve from the markup. Readers
guess it is there for old browsers, and that guess now has no browser to point at. It survives
on inertia, and every copy teaches the next author that it is required.

The standard's tolerance is narrow. When `shortcut` is present, "the rel attribute's entire
value must be an ASCII case-insensitive match for the string "shortcut icon"", with a single
space between the tokens. `rel="shortcut icon mask-icon"`, `rel="icon shortcut"` and a double
space are non-conforming as well as inert.

## Use instead

Delete the token. Nothing else about the element changes:

```html
<!-- Before -->
<link rel="shortcut icon" href="/favicon.ico">

<!-- After -->
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
```

The `/favicon.ico` file at the site root keeps working with or without a link to it. The
standard lets a browser fetch `/favicon.ico` "in the absence of a link with the icon keyword",
and the major browsers do so. A page that lists an SVG icon can still keep the `.ico` link for
software that reads only ICO or PNG files.

## Detectability

Detectable with one selector. The CLI, the bookmarklet and the ESLint plugin report the same
findings, and none skips. The rule matches one whitespace-separated token with `~=`, which is
how a browser parses `rel`, so the selector agrees with the parser. The `i` flag matters: link
types are ASCII case-insensitive and older boilerplate is full of `rel="Shortcut Icon"`.

The fix removes the single token and leaves the rest of `rel` alone, so a
`rel="shortcut icon mask-icon"` keeps its `mask-icon`, and the quoting is left as written: the
edit happens inside the delimiter. If `shortcut` is the only token, no fix is offered: emptying
`rel` would say something different from what the author wrote, and that is a decision for a
person.

## Resources

- [HTML Standard: `rel="icon"`](https://html.spec.whatwg.org/multipage/links.html#rel-icon): the keyword the specification defines; "For historical reasons, the icon keyword may be preceded by the keyword "shortcut"", with the whole value then "shortcut icon"; the `/favicon.ico` fallback.
- [HTML Standard: link types](https://html.spec.whatwg.org/multipage/links.html#linkTypes): the registry of `rel` keywords, which lists no `shortcut` type.
- [Mathias Bynens: `rel="shortcut icon"` considered harmful](https://mathiasbynens.be/notes/rel-shortcut-icon): Internet Explorer 8 and earlier ignored `rel="icon"` without `shortcut` and did not split `rel` into tokens; IE9 needed it only without `type="image/x-icon"`.
- [Microsoft Lifecycle: Internet Explorer 11 end of support](https://learn.microsoft.com/en-us/lifecycle/announcements/internet-explorer-11-end-of-support): the IE 11 desktop application's support ended on 2022-06-15 for Windows 10 semi-annual channel versions.
