---
ruleId: "head/viewport-missing"
title: "missing meta viewport"
description: "Without a viewport meta tag, mobile browsers lay the page out at a desktop width of about 980px and shrink it to fit."
pubDate: "2026-09-13"
status: "avoid"
severity: "harmful"
standardsBasis: "browser-convention"
detectability: "yes"
kind: "document"
scope: "head"
match: "logic"
fix: { op: "none" }
replacement: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> inside <head>, right after <meta charset>."
tags: ["mobile"]
impacts: ["a11y", "interop"]
related: ["meta/viewport-user-scalable"]
---

A page with no `<meta name="viewport">` tells a mobile browser nothing about how wide to
lay it out, and the browser assumes the worst: a desktop page, written before phones
existed. It renders the page in a virtual window about 980 pixels wide and shrinks the
result onto a screen a third of that.

## Why avoid

Everything responsive stops working. MDN describes the fallback plainly: mobile browsers
render "in a virtual window or viewport that is wider than the screen (e.g., 980px), then
shrink the rendered result to fit", and that mechanism "breaks responsive design techniques
using media queries". A `max-width: 600px` breakpoint never fires, because as far as CSS
is concerned the viewport is 980px wide. The phone gets the desktop layout at a fraction of
its size.

The people using it pay for that directly. Text renders too small to read, so every page
becomes pinch, zoom and pan, sideways as well as down. Google's Lighthouse fails a page
without the tag for exactly this reason: mobile devices "render pages at typical desktop
screen widths and then scale the pages down, making them difficult to read". It is one line
of markup, and leaving it out undoes all the CSS that follows.

## Use instead

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>…</title>
</head>
```

`width=device-width` sets the layout viewport to the screen's width in device-independent
pixels, so media queries and `vw` units mean what they say. `initial-scale=1` sets a 1:1
ratio between CSS pixels and those device pixels in either orientation. Don't add
`user-scalable=no` or a low `maximum-scale` to it (see `meta/viewport-user-scalable`).

A desktop-only page can go without: an internal admin tool or an iframe-only embed
qualifies. An HTML email body qualifies too. Say so where it happens:
`<!-- deadhead-disable head/viewport-missing -->`.

## Detectability

Fully detectable, as a document rule, because the finding is about an element that isn't
there. The finding lands on `<head>`. A viewport `<meta>` anywhere in the document counts, since
browsers apply one even when it's misplaced in `<body>`. Presence is all this checks: a
viewport without `width=device-width` is a different problem. A desktop page that names its
separate mobile URL with `<link rel="alternate" media="…">`, Google's annotation for that setup,
stays quiet: phones get the other page.

The rule reports nothing on a fragment, a file with no doctype and no `<html>` tag such as
a partial or a component template: the viewport belongs to the page around it. On a page it
also needs a `<head>` with at least one element in it. One edge remains: a page that omits its
`<head>` tag, like `<!doctype html><title>…`, gets reported by the CLI without a line number
and not by the ESLint plugin, because only the CLI's parser invents the missing head.

There is no autofix. The remedy adds an element, and every fix here only removes.

## Resources

- [Google Search Central: mobile-first indexing best practices](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing): a desktop page on separate URLs links its mobile version with `rel="alternate" media="only screen and (max-width: 640px)"`.
- [MDN: `<meta name="viewport">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport): the ~980px virtual viewport, shrink-to-fit, and how it breaks media queries.
- [web.dev: Responsive web design basics: set the viewport](https://web.dev/articles/responsive-web-design-basics#viewport): desktop-width rendering without the tag; what `width=device-width` and `initial-scale=1` each do.
- [Chrome for Developers: Lighthouse: viewport meta tag](https://developer.chrome.com/docs/lighthouse/pwa/viewport): pages without the tag are "difficult to read"; the audit's failure conditions.
- [CSS Viewport Module Level 1: viewport meta](https://drafts.csswg.org/css-viewport/#viewport-meta): the tag as written down by the CSS Working Group.
