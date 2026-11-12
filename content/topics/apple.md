---
description: "Apple-only meta names and icon links from before the web app manifest, what Safari reads today, and the six rules that report the rest."
---

Apple shipped installable web apps years before there was a standard for them. A page
saved to the iPhone Home Screen could launch without Safari's interface, style the status
bar, set its own label and carry a pre-glossed icon, each switched on by an Apple-only
`<meta>` name or link type. Favicon generators and templates still write the whole set.

Most of it is superseded by the
[web app manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest),
which iOS reads: `display` sets the standalone launch, `name` and `short_name` the label,
and, since Safari 15.4, `icons` the home-screen image when no `apple-touch-icon` is
declared. The tags left over cost little,
but each is a second place to keep a name or an icon in step with the manifest.

Deadhead reports six, all unnecessary:

- [`meta/apple-mobile-web-app-capable`](/rules/meta/apple-mobile-web-app-capable) and
  [`meta/apple-touch-fullscreen`](/rules/meta/apple-touch-fullscreen): standalone launch,
  which the manifest's `display` member covers.
- [`meta/apple-mobile-web-app-title`](/rules/meta/apple-mobile-web-app-title): the
  home-screen label, which falls back to `<title>`.
- [`meta/apple-mobile-web-app-status-bar-style`](/rules/meta/apple-mobile-web-app-status-bar-style):
  the status bar of a full-screen app. `theme-color` styles a different surface and does not
  replace it, so check before deleting it from an app that relies on it.
- [`link/apple-touch-icon-precomposed`](/rules/link/apple-touch-icon-precomposed): a second
  touch icon, obsolete since iOS 7 stopped adding gloss.
- [`link/mask-icon`](/rules/link/mask-icon): Safari's pinned-tab icon. No autofix, because
  Safari still prefers it to the favicon when present.

One `<link rel="apple-touch-icon">` is still worth keeping. The [icons](/topics/icons) and
[web apps](/topics/web-app) topics cover the rest of the install metadata.
