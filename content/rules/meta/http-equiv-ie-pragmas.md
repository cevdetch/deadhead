---
ruleId: "meta/http-equiv-ie-pragmas"
title: "<meta http-equiv> IE pragmas"
description: "imagetoolbar, msthemecompatible, and the Page/Site-Enter/Exit transitions only ever worked in Internet Explorer; delete the tags."
pubDate: "2026-09-14"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv]'
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete the tag. Image toolbars, XP theming hooks, and DX-filter page transitions have no modern equivalent."
tags: ["http-equiv", "microsoft"]
impacts: ["maintainability"]
related: ["meta/msapplication-names"]
---

A cluster of http-equiv values only ever worked in Internet Explorer. `imagetoolbar` silenced
the IE 6 image toolbar and `msthemecompatible` took Windows XP visual styles. A transitions
family played PowerPoint-style wipes between page loads.

Each answered a feature of one browser. Internet Explorer 6 showed a "My Pictures image toolbar"
over images, and `<meta http-equiv="imagetoolbar" content="no">` turned it off for the page. The
`Page-Enter`, `Page-Exit`, `Site-Enter` and `Site-Exit` values ran a DirectX filter, such as
`revealTrans(duration=2,transition=2)`, as the visitor arrived at or left a page or site.

## Why avoid

The audience is retired. Microsoft ended support for the IE 11 desktop application on certain
versions of Windows 10 on 15 June 2022 and later disabled it there; every other browser has
always ignored these values. The features went before the browser did: Microsoft's documentation
marks the per-image `galleryimg` switch obsolete "As of Windows Internet Explorer 7", and the
filters and transitions behind the page transitions are "deprecated as of Windows Internet
Explorer 9".

What remains is prevalent dead weight: `imagetoolbar` alone survives on over a hundred thousand
sites, maintained for a browser Microsoft has retired. The values are not part of the HTML
Standard's pragma table, so they map to no state in every current engine, and Microsoft Edge,
built on Chromium, ignores them like the rest.

## Use instead

Delete the tags:

```html
<!-- Before -->
<meta http-equiv="imagetoolbar" content="no">
<meta http-equiv="MSThemeCompatible" content="yes">
<meta http-equiv="Page-Enter" content="revealTrans(duration=2,transition=2)">

<!-- After: nothing -->
```

There is no replacement for the first two because there is nothing left to switch: no other
engine has an image toolbar or XP theming hooks. A site that wants an animated change between
pages has a standard tool now: cross-document view transitions, opted into from CSS with
`@view-transition { navigation: auto; }` on both pages, in browsers that support them.

## Detectability

The rule pre-filters with `meta[http-equiv]`: the verdict depends on whether the trimmed value,
compared ASCII case-insensitively, is one of the six IE-only keywords. The decision therefore
lives in `packages/rules/logic/meta/http-equiv-ie-pragmas.ts`. The CLI, the bookmarklet and the
ESLint plugin report the same findings, and none skips. Deliberately excluded: `cleartype`: no
primary Microsoft source for an http-equiv switch surfaced, so it stays unclaimed, not guessed,
and `meta/http-equiv-unregistered-pragmas` reports it instead. The fix removes the element: no
surviving browser acts on any claimed value.

## Resources

- [Microsoft Learn: Introduction to Filters and Transitions (archived IE docs)](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/ms532847(v=vs.85)): Page-Enter/Page-Exit/Site-Enter/Site-Exit interpage transitions via meta tags; deprecated as of IE9.
- [Microsoft Learn: `galleryimg` attribute (archived IE docs)](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/ms533774(v=vs.85)): `http-equiv="imagetoolbar"` with `content="no"` disables the My Pictures image toolbar for the page; the attribute is obsolete as of IE7.
- [Microsoft Lifecycle FAQ: Internet Explorer and Microsoft Edge](https://learn.microsoft.com/en-us/lifecycle/faq/internet-explorer-microsoft-edge): the IE 11 desktop app permanently disabled on certain versions of Windows 10.
- [Microsoft Learn: IE11 end of support](https://learn.microsoft.com/en-us/lifecycle/announcements/internet-explorer-11-end-of-support): the IE 11 desktop application ended support on certain versions of Windows 10 on June 15, 2022.
- [HTML Standard: Pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives): none of these values is a pragma keyword, so all map to no state.
- [MDN: `@view-transition`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition): the opt-in for cross-document view transitions.
