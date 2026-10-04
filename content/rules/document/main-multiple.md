---
ruleId: "document/main-multiple"
title: "more than one visible main element"
description: "Two main elements break landmark navigation; keep one visible main and hide the rest."
pubDate: "2026-09-14"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "body"
match: "logic"
fix: { op: "none" }
replacement: "Keep one visible <main> for the page's dominant content. Give inactive views the hidden attribute, and use <section> or <article> for everything else."
tags: ["one-per-page"]
impacts: ["a11y"]
related: ["document/html-lang"]
---

Two visible `<main>` elements give a page two answers to "where is the content?". `<main>`
marks the dominant content of a page, the part a visitor came for, as opposed to the
header and footer around it. Assistive technology treats it as the
place to jump to. That only works if there is one: people navigating by landmark get whichever
comes first.

## Why avoid

The HTML Standard allows exactly one. "The main element represents the dominant contents of
the document. A document must not have more than one main element that does not have the
hidden attribute specified." The `hidden` exception is deliberate. An application can keep
inactive views in the DOM, as long as only one `<main>` is live.

ARIA says the same about the role `<main>` maps to. WAI-ARIA 1.2: "Within any document or
application, the author SHOULD mark no more than one element with the main role." The ARIA
Authoring Practices: "Each page should have one main landmark."

The people it fails are the ones who rely on it most. Screen reader users jump straight to the
main landmark with a single keystroke or a rotor gesture, and "Skip to main content" links
send keyboard users to the same place. With two visible `<main>` elements, both land on one of
them. The content in the other is easy to miss entirely, or mistaken for something secondary.
It rarely looks wrong on screen. It comes from a page template's `<main>` rendered
inside an app shell's `<main>`, or from single-page-app views hidden with CSS instead of
`hidden`.

## Use instead

One visible `<main>`. Inactive views carry `hidden`, and other regions use `<section>`,
`<article>` or `<aside>`:

```html
<body>
  <header>…</header>
  <main>
    <h1>Inbox</h1>
    …
  </main>
  <main hidden>…the settings view, not shown right now…</main>
  <footer>…</footer>
</body>
```

When a view becomes active, move `hidden` rather than toggling `display` in CSS.

## Detectability

Fully detectable, as a document rule, because a selector can't count. Once a document has two
or more `main` elements without the `hidden` attribute, the rule reports each of them. An element
hidden only by CSS still counts, since the markup has no way to show it's hidden. That is
the case the Standard's `hidden` requirement covers. `hidden="until-found"` has the attribute,
so it doesn't count, and neither does a `main` under a `hidden` ancestor or a closed
`<dialog>`: neither is in the accessibility tree, so neither is a landmark.

Two related problems aren't covered: a `<div role="main">` alongside a `<main>`, and a
`<main>` nested inside `<article>`, `<aside>` or `<nav>`.

There is no autofix: deciding which region is the page's main content is the author's call.

## Resources

- [HTML Standard: the main element](https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element): "A document must not have more than one main element that does not have the hidden attribute specified."
- [W3C: WAI-ARIA 1.2: main role](https://www.w3.org/TR/wai-aria-1.2/#main): "the author SHOULD mark no more than one element with the main role."
- [W3C: ARIA Authoring Practices: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/): "Each page should have one main landmark."
