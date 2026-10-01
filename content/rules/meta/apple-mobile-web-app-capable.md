---
ruleId: "meta/apple-mobile-web-app-capable"
title: "<meta name=\"apple-mobile-web-app-capable\">"
description: "Apple's pre-manifest switch for launching a Home Screen web app standalone; the manifest's display member replaces it."
pubDate: "2026-09-13"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="apple-mobile-web-app-capable" i]'
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete it and declare \"display\": \"standalone\" in a web app manifest linked with <link rel=\"manifest\">."
tags: ["apple", "web-app"]
impacts: ["maintainability"]
related: ["meta/mobile-web-app-capable", "link/apple-touch-icon-precomposed"]
---

The web app manifest replaces `<meta name="apple-mobile-web-app-capable">`. The tag told
iOS that a page saved to the Home Screen should launch like an app, without Safari's address
bar and toolbar. Apple introduced it years before the web had a standard way to say so.

## Why avoid

The standard way exists and WebKit leads with it: the manifest's `display` member declares
how an installed app launches. WebKit's iOS 16.4 announcement names the manifest first and
the meta tag in passing.

Chromium parses the tag too, and Chrome logs a console deprecation warning for it: a page
carrying it gets a warning in the most-used engine for a setting its manifest should hold.
A page carrying both states its launch mode twice, in two formats, and one is portable.

**Removing it is not free on iOS.** iOS still reads the
tag:

- **Without a manifest** that sets `display` to `standalone` or `fullscreen`, iOS 16.4 to
  18 save the site as a Home Screen bookmark that opens in the default browser. Since iOS
  26, every site added to the Home Screen opens as a web app by default, tag or not.
- **With a manifest**, the launch is standalone, but `apple-touch-startup-image` splash
  screens stop appearing and the app opens on a black screen. Next.js hit this when it
  swapped the tag out in version 15, and closed the report as not planned.

Delete it anyway. Put the launch mode in the manifest first, and treat custom iOS splash
images as the price of dropping a vendor switch.

## Use instead

```html
<link rel="manifest" href="/app.webmanifest">
```

```json
{
  "name": "Example",
  "start_url": "/",
  "display": "standalone"
}
```

Don't swap it for `mobile-web-app-capable`, as Chrome's console suggests: the manifest
replaces both.

## Detectability

Fully detectable. `<meta name>` holds a single value, so the rule matches with `=`
and the `i` flag.

The fix removes the element when the head also links a manifest and no
`apple-touch-startup-image`: then iOS takes the launch mode from the manifest and loses no
splash screen. Elsewhere the finding carries no fix. The logic in
`packages/rules/logic/meta/apple-mobile-web-app-capable.ts` reads the siblings; it cannot read
the manifest file, so give it `display` set to `standalone`.

## Resources

- [Apple Developer: Configuring Web Applications (Safari Web Content Guide, archived)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html): where the tag and `apple-touch-startup-image` were defined.
- [WebKit: Web Push for Web Apps on iOS and iPadOS (February 2023)](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): before iOS 26, a site with neither a `standalone` manifest nor "a meta tag marking the site as web app capable" saved as a bookmark.
- [WebKit: Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/): "By default, every website added to the Home Screen opens as a web app".
- [Apple: Safari 26 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes): "Added support for any website to become a web app on iOS or iPadOS".
- [W3C: Web Application Manifest: display member](https://www.w3.org/TR/appmanifest/#display-member): the standard replacement.
- [Chromium: `components/webapps/renderer/web_page_metadata_extraction.cc`](https://github.com/chromium/chromium/blob/main/components/webapps/renderer/web_page_metadata_extraction.cc): Chromium reads the tag too.
- [vercel/next.js#74524: removal of apple-mobile-web-app-capable results in splash screens not working](https://github.com/vercel/next.js/issues/74524): the iOS startup-image consequence of removing the tag.
