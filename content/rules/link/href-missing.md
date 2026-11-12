---
ruleId: "link/href-missing"
title: "<link> without href or imagesrcset"
description: "A link with no href, no imagesrcset and no itemprop defines no link."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link:not([href]):not([imagesrcset]):not([itemprop])'
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete the element. If a resource was meant, name it: <link rel=\"stylesheet\" href=\"main.css\">."
tags: ["hyperlinks"]
impacts: ["maintainability"]
related: ["link/preload-as-missing"]
---

A `link` with no `href`, no `imagesrcset` and no `itemprop` defines no link. The element fetches
nothing and navigates nowhere.

The tag keeps its `rel`, so it reads as if it works: `<link rel="stylesheet">`,
`<link rel="canonical">`, `<link rel="preconnect">`. What it lost is the address. Templates
produce the shape when the variable behind the URL is empty. Component templates drop an
attribute whose value is `null` or `undefined`, as Astro's renderer does, so
`href={page.canonical}` on a page without a canonical renders a bare `<link rel="canonical">`.
Hand edits produce it when a URL is deleted and the tag is spared.

## Why avoid

The HTML Standard: "One or both of the href or imagesrcset attributes must be present. If both
the href and imagesrcset attributes are absent, then the element does not define a link." With
no link, no `rel` keyword applies: a stylesheet loads nothing, a preload or preconnect warms
nothing, and a canonical names no URL.

The effect depends on what the author expected the tag to do, and most of it is invisible. A
missing stylesheet shows as unstyled content; a missing canonical or icon shows nowhere, since
the page falls back to the browser's or the search engine's own choice. A reader of the head
sees a canonical and assumes one is in place.

The tag also costs bytes and review time. Every reader of the head stops at it, and every
template change has to keep it, for an element that does nothing in the served page.

Microdata is no excuse here. A `link` carrying `itemprop` answers to a different model and never
trips this rule.

## Use instead

Give the tag its address, or delete it:

```html
<!-- Before: neither link defines anything -->
<link rel="stylesheet">
<link rel="canonical">

<!-- After -->
<link rel="stylesheet" href="/main.css">
<link rel="canonical" href="https://example.com/guide">
```

In a template, render the whole element only when the URL exists, not the tag with an attribute
that can disappear. For a responsive image preload, `imagesrcset` stands in for `href`:
`<link rel="preload" as="image" imagesrcset="/hero-800.jpg 800w, /hero-1600.jpg 1600w" imagesizes="100vw">`
is a complete link.

A link that a script fills in later is a different case, covered below: keep it until the script
that writes it is gone.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. Each `:not` pins one address attribute absent, so the rule trips
when all three are gone; any one present keeps it quiet. Microdata links stay quiet through the
`itemprop` guard. An empty `href=""` is an attribute that is present, so it stays outside this
rule; an empty canonical reports under `link/canonical-relative`.

A link with an `id` or a `data-*` attribute is reported but not deleted. Those mark a hook a
script fills in: a lazy stylesheet, a theme switch, a head manager's slot. HTML fetches an
external resource link when its `href` "is changed", so the element goes live the moment a
script sets one. In the top 10,000 crawl of 2026-10-04, 16 of 20 sampled findings were such
hooks. Delete one only after finding the script that writes it. Every other finding carries an
autofix that removes the element, which changes nothing: the element defines no link.

## Resources

- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): "One or both of the href or imagesrcset attributes must be present. If both the href and imagesrcset attributes are absent, then the element does not define a link."
- [WHATWG HTML: link type "stylesheet"](https://html.spec.whatwg.org/multipage/semantics.html#link-type-stylesheet): the link is fetched and processed when its element becomes connected and "when the href attribute of the link element of an external resource link that is already browsing-context connected is changed".
- [MDN: `<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link): `href` as the URL of the linked resource, and `imagesrcset` and `imagesizes` for preloading responsive images.
- [Astro: `addAttribute` in the server renderer](https://github.com/withastro/astro/blob/main/packages/runtime/src/internal/server/render/util.ts): an attribute whose value is `null` or `undefined` renders as nothing.
