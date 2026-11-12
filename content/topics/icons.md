---
description: "Favicon and home-screen icon markup: what one rel=icon set and a manifest cover, and the legacy icon links deadhead reports."
---

A site needs few icon declarations. Browsers read `<link rel="icon">` for tabs and
bookmarks, and an SVG with a small ICO beside it covers every current engine. One
`<link rel="apple-touch-icon">`, or the `icons` in a web app manifest, gives iOS and
installed apps a home-screen image; Safari has read manifest icons when a page declares no
`apple-touch-icon` since version 15.4.

Favicon generators still write much more, mostly for browsers and devices that are gone,
and every extra declaration is another file to replace when the logo changes. Deadhead
reports four, all unnecessary:

- [`link/shortcut-icon`](/rules/link/shortcut-icon): the `shortcut` in
  `rel="shortcut icon"`, an Internet Explorer 5 spelling. Browsers act on the `icon` token
  alone, and the fix removes `shortcut`.
- [`link/apple-touch-icon-precomposed`](/rules/link/apple-touch-icon-precomposed): a second
  home-screen icon whose only effect, skipping the gloss iOS stopped adding in iOS 7, is now
  the default. Reported only when a plain `apple-touch-icon` exists too.
- [`link/mask-icon`](/rules/link/mask-icon): Safari's monochrome pinned-tab icon, never a
  standard link type. It has no autofix, because Safari still prefers it when present and
  removing it changes the pinned tab.
- [`meta/msapplication-names`](/rules/meta/msapplication-names): Internet Explorer's
  pinned-site and Start-tile names. Delete `browserconfig.xml` with them.

What replaces them is four lines:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/app.webmanifest">
```

[favseed](https://favseed.cevdet.ch/) builds those files from one SVG: the ICO, the SVG,
the touch icon and the 192 and 512 pixel PNGs a manifest lists. It prints the `<link>` tags
too. The
HTML Standard defines the [`icon` link type](https://html.spec.whatwg.org/multipage/links.html#rel-icon).
