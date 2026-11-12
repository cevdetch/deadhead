---
ruleId: "meta/msapplication-names"
title: "<meta name=\"msapplication-*\">"
description: "Internet Explorer pinned-site and Start-tile metadata; IE is gone, and no supported browser reads these names."
pubDate: "2026-09-13"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name^="msapplication-" i]'
fix: { op: "remove-element" }
replacement: "Delete the tags and browserconfig.xml; put the app name, colours and icons in a web app manifest."
tags: ["icons", "microsoft", "web-app"]
impacts: ["maintainability"]
related: ["meta/application-name"]
---

The `msapplication-*` names configured Internet Explorer's pinned sites and Start-screen tiles.
Internet Explorer is gone, and no supported browser reads them.

## Why avoid

Internet Explorer 9 let a user pin a site to the Windows taskbar, and Internet Explorer 11
extended that to live tiles on the Windows 8 Start screen. A site described the pin and the tile
with Microsoft's own `<meta>` names, plus a `browserconfig.xml` referenced from
`msapplication-config`. Favicon generators still emit the whole set.

Microsoft's documentation for the feature now lives under *previous versions*, marked archived.
The Internet Explorer 11 desktop application went out of support on June 15, 2022 on certain
versions of Windows 10, and has since been permanently disabled on them; the EdgeHTML-based
Edge, which read the tile names, went out of support on March 9, 2021. Windows 11 dropped live
tiles: "Live Tiles are no longer available." The tags were never standardised, so nothing will
revive them, and every page that carries them pays for a block nothing reads. They remain
common: in the top 10,000 crawl of 2026-10-04, 1,254 of the 4,570 home pages linted from their
served HTML carried at least one.

## Use instead

A web app manifest. Browsers that install or pin sites read the name, colours and icons from it:

```html
<!-- Before: a tile set for a retired Start screen -->
<meta name="msapplication-TileColor" content="#cc241d">
<meta name="msapplication-TileImage" content="/mstile-144x144.png">
<meta name="msapplication-config" content="/browserconfig.xml">

<!-- After -->
<link rel="manifest" href="/app.webmanifest">
```

```json
{
  "name": "Example",
  "short_name": "Example",
  "theme_color": "#cc241d",
  "background_color": "#ffffff",
  "icons": [{ "src": "/icon-192.png", "type": "image/png", "sizes": "192x192" }]
}
```

The tile colour and logos have their nearest counterparts in the manifest's `background_color`
and `icons`; Microsoft's own example pairs them with `application-name`, which stays as a
standard metadata name. Live-tile notifications and the `msapplication-notification` polling
URIs have no manifest equivalent and go without one. Delete `browserconfig.xml` along with the
tags, and any `msapplication-config` set to `none`, which Microsoft documented as the way "To
cancel a browser configuration file": with no reader, there is nothing to cancel.

## Detectability

Fully detectable. `<meta name>` holds a single value, so the rule matches the `msapplication-`
prefix with the `i` flag; the documented names mix case (`msapplication-TileColor`). It leaves
`application-name` alone: IE used it for the pinned-site title, but it is a standard HTML
metadata name, and `meta/application-name` covers it. The CLI, the bookmarklet and the ESLint
plugin report the same findings, and none skips. The fix deletes each tag.

## Resources

- [Microsoft Learn: Pinned Sites (Internet Explorer), archived](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/hh772707(v=vs.85)): defines the msapplication-* metadata, browserconfig.xml and `msapplication-config` as IE pinned-site features.
- [Microsoft Lifecycle FAQ: Internet Explorer and Microsoft Edge](https://learn.microsoft.com/en-us/lifecycle/faq/internet-explorer-microsoft-edge): IE11 desktop app out of support June 15, 2022 and disabled on Windows 10; legacy Edge out of support March 9, 2021.
- [Microsoft: Windows 11 specifications, feature deprecations](https://www.microsoft.com/en-us/windows/windows-11-specifications): "Live Tiles are no longer available."
- [W3C: Web Application Manifest](https://www.w3.org/TR/appmanifest/): the cross-browser home for app name, colours and icons.
