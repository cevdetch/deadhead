---
ruleId: "meta/apple-mobile-web-app-status-bar-style"
title: "<meta name=\"apple-mobile-web-app-status-bar-style\">"
description: "Apple switch for the status bar of full-screen Home Screen apps; theme-color styles a different surface and does not replace it."
pubDate: "2026-09-19"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="apple-mobile-web-app-status-bar-style" i]'
match: "logic"
fix: { op: "remove-element" }
replacement: "Keep it for a full-screen Home Screen app; theme-color styles Safari's own UI, a different surface. Delete only a tag with content=\"default\" or no content."
tags: ["apple", "web-app"]
impacts: ["maintainability"]
related: ["meta/apple-mobile-web-app-capable", "meta/apple-mobile-web-app-title"]
---

`<meta name="apple-mobile-web-app-status-bar-style">` styles the status bar of a full-screen Home Screen app. No other browser acts on the switch. theme-color styles Safari's own tab and overscroll UI, a different surface, and does not replace it there.

## Why avoid

Apple defined the switch for full-screen Home Screen apps and marks it an Apple extension. It takes three values, `default`, `black`, and `black-translucent`. It has no effect without full-screen mode.

Deleting the sibling `apple-mobile-web-app-capable` tag does not remove that mode: since iOS 11.3 a manifest with `display` set to `standalone` launches the Home Screen app without it, and Maximiliano Firtman's iOS PWA compatibility table lists `black-translucent` as "still the only way to get a fullscreen app".

theme-color does not do this job. WebKit's Safari 15 announcement documents theme-color coloring "the status bar and overscroll area in Safari" itself, the browser chrome, not a standalone Home Screen app's status bar. Since Safari 26 even that Safari-chrome tint comes from the page background and fixed or sticky elements, not from theme-color (WebKit bug 301756). Apple's `black-translucent` value still lays page content under the status bar in a standalone app; only `content="default"`, the existing default, is a no-op.

## Use instead

Keep the tag if the site ships a full-screen Home Screen app and needs `black` or `black-translucent`. Ship theme-color too, for Safari's own UI, since it styles a different surface:

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#226DAA">
```

Delete the tag only when its value is `default` or it has no `content`, since either matches the status bar with the tag absent. The fixer deletes those.

## Detectability

Detectable with logic refining the selector. The match uses `=` with the `i` flag: `name` holds a single value, not a token set. The module reports a missing, `default` or unknown `content`, which styles nothing, and the autofix deletes it.

`black` and `black-translucent` stay quiet. Since iOS 26 every site added to the Home Screen opens as a web app, so both style a status bar that theme-color does not reach.

## Resources

- [Apple Developer: Supported Meta Tags (Safari HTML Reference, archived)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html): Apple defines the tag as an Apple extension with three values and no effect without full-screen mode.
- [WebKit blog: New WebKit Features in Safari 15 (October 2021)](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/): WebKit supports theme-color in meta and manifest, and theme-color colors the status bar and overscroll area in Safari's own browser chrome.
- [HTML Standard: meta theme-color](https://html.spec.whatwg.org/multipage/semantics.html#meta-theme-color): theme-color is a standard metadata name for a color browsers use to customize surrounding UI.
- [Maximiliano Firtman: iOS PWA compatibility notes](https://firt.dev/notes/pwa-ios/): a secondary compatibility table; `apple-mobile-web-app-capable` is optional since iOS 11.3 with manifest `display: standalone`, and `black-translucent` is "still the only way to get a fullscreen app".
- [WebKit Bugzilla 301756](https://bugs.webkit.org/show_bug.cgi?id=301756): as of Safari 26, Safari's own chrome tint comes from the page background and fixed or sticky elements, not from theme-color.
