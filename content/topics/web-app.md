---
description: "Install and home-screen metadata in meta tags, from Apple, Chrome and Microsoft, and the web app manifest that replaced it."
---

Before the web had a standard way to describe an installable app, each platform invented
its own `<meta>` names. Apple's set launched a Home Screen bookmark without Safari's
interface, styled its status bar and labelled its icon. Chrome for Android copied the first
switch without the prefix as `mobile-web-app-capable`. Internet Explorer read
`msapplication-*` names for pinned sites and Start-screen tiles. All of it predates the
[web app manifest](https://www.w3.org/TR/appmanifest/), a JSON file linked with
`<link rel="manifest">` that browsers which install sites now read for the name, icons,
colours and display mode.

The leftover tags are dead weight at best. At worst they are a second copy of the app's
name or behaviour that drifts away from the manifest, and nobody can tell from the markup
which one a device uses.

Deadhead reports eight, all unnecessary and all deleted by the fix:

- [`meta/apple-mobile-web-app-capable`](/rules/meta/apple-mobile-web-app-capable),
  [`meta/apple-touch-fullscreen`](/rules/meta/apple-touch-fullscreen) and
  [`meta/mobile-web-app-capable`](/rules/meta/mobile-web-app-capable): standalone launch,
  which the manifest's `display` member sets.
- [`meta/apple-mobile-web-app-title`](/rules/meta/apple-mobile-web-app-title),
  [`meta/application-name`](/rules/meta/application-name) and
  [`meta/application-title`](/rules/meta/application-title): the app's name or title bar
  text. `name` and `short_name` in the manifest carry it, and `application-title` works in
  Chromium alone.
- [`meta/apple-mobile-web-app-status-bar-style`](/rules/meta/apple-mobile-web-app-status-bar-style):
  the status bar of a full-screen Home Screen app, a surface `theme-color` does not style.
- [`meta/msapplication-names`](/rules/meta/msapplication-names): Internet Explorer tiles.

`application-name` is a standard metadata name, not a vendor relic, and is reported because
most pages that carry it are not applications. Check a rule's page before deleting a tag an
installed app may still read. The [Apple](/topics/apple) and [icons](/topics/icons) topics
cover the icon side.
