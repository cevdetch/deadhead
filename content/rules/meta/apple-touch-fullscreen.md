---
ruleId: "meta/apple-touch-fullscreen"
title: "<meta name=\"apple-touch-fullscreen\">"
description: "An undocumented iPhone switch for full-screen Home Screen apps that Apple's references omit; the manifest's display member does the job."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="apple-touch-fullscreen" i]'
fix: { op: "remove-element" }
replacement: "Delete it. Declare \"display\": \"standalone\" in a web app manifest linked with <link rel=\"manifest\">."
tags: ["apple", "web-app"]
impacts: ["maintainability"]
related: ["meta/apple-mobile-web-app-capable", "meta/mobile-web-app-capable", "meta/page-info-names"]
---

`<meta name="apple-touch-fullscreen">` asked the iPhone to open a page saved to the Home Screen
without Safari's interface. Apple documented a different name for that job,
`apple-mobile-web-app-capable`, and the web app manifest now covers both.

## Why avoid

Apple's references leave it out. The Supported Meta Tags reference lists
`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `format-detection` and
`viewport`, and its guide to configuring web applications adds `apple-mobile-web-app-title`.
`apple-touch-fullscreen` appears in neither. The WHATWG MetaExtensions registry holds it as a
Proposal with "No specification yet" and the note "forces iPhone Fullscreen mode, if added to
home screen. Not needed anymore."

The open engine sources do not read it either. WebKit's `HTMLMetaElement.cpp` acts on
`viewport`, `theme-color`, `format-detection`, `apple-mobile-web-app-orientations` and
`referrer`, among others, and not on this name. Chromium's web app metadata extraction reads
`mobile-web-app-capable` and `apple-mobile-web-app-capable`, and not this name.

The HTML Standard's predefined metadata names do not include it, so the name rests on vendor
practice alone. In the top 10,000 crawl of 2026-10-04, 40 of the 4,570 home pages linted from
their served HTML still carried it.

## Use instead

Declare the launch mode in a web app manifest:

```html
<!-- Before: an undocumented switch -->
<meta name="apple-touch-fullscreen" content="yes">

<!-- After -->
<link rel="manifest" href="/app.webmanifest">
```

```json
{
  "name": "Example",
  "start_url": "/",
  "display": "standalone"
}
```

Pick `standalone`, despite the old tag's name. MDN's compatibility data records `display`
support in Safari on iOS since 11.3 for `standalone` and `browser`, and none for `fullscreen` or
`minimal-ui`; Chrome on Android supports all four. A `standalone` app opens from the Home Screen
in its own window, without the browser's address bar, which is what `apple-touch-fullscreen`
asked for. `meta/apple-mobile-web-app-capable` covers the documented Apple switch and what iOS
still does with it.

## Detectability

Detectable with the selector alone. `<meta name>` holds a single value, so the rule matches with
`=` and the `i` flag. The autofix deletes the element: Apple documents no reader for the name,
and neither WebKit nor Chromium source reads it.

## Resources

- [Apple Developer: Supported Meta Tags (Safari HTML Reference, archived)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html): the Apple-specific names Safari supports; `apple-touch-fullscreen` is not among them.
- [Apple Developer: Configuring Web Applications (Safari Web Content Guide, archived)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html): the Home Screen web app names Apple documented, without this one.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): a Proposal with no specification; "Not needed anymore".
- [WebKit: `HTMLMetaElement.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/HTMLMetaElement.cpp): the `meta` names WebKit's engine acts on.
- [Chromium: `components/webapps/renderer/web_page_metadata_extraction.cc`](https://github.com/chromium/chromium/blob/main/components/webapps/renderer/web_page_metadata_extraction.cc): the web app names Chromium reads.
- [W3C: Web Application Manifest: display member](https://www.w3.org/TR/appmanifest/#display-member): the standard replacement.
- [MDN browser-compat-data: `manifests.webapp.display`](https://github.com/mdn/browser-compat-data/blob/main/manifests/webapp.json): `standalone` in Safari on iOS since 11.3, `fullscreen` and `minimal-ui` unsupported there.
