---
ruleId: "link/apple-touch-icon-precomposed"
title: "<link rel=\"apple-touch-icon-precomposed\"> as a second icon"
description: "A second declaration of the home-screen icon whose only effect, skipping iOS's gloss overlay, has been the default since iOS 7."
pubDate: "2026-09-13"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "document"
scope: "head"
match: "logic"
fix: { op: "remove-element" }
replacement: "Keep <link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\"> and delete the precomposed link."
tags: ["apple", "icons"]
impacts: ["maintainability"]
related: ["link/mask-icon", "meta/apple-mobile-web-app-capable"]
---

The `apple-touch-icon-precomposed` suffix is obsolete since iOS 7. Before iOS 7, Safari
dressed every home-screen icon in rounded corners and a glossy
highlight. Sites that had already drawn their own finish opted out with a second
spelling, `<link rel="apple-touch-icon-precomposed">`, and Apple's guidance was to
declare both. Favicon generators still write the pair, pointing both entries at the same PNG.

## Why avoid

The suffix no longer does anything. Apple's own guide says it plainly: "Safari on iOS 7
doesn't add effects to icons. Older versions of Safari will not add effects for icon
files named with the -precomposed.png suffix." Once no icon gets an effect, an opt-out
from that effect has nothing to opt out of. Google's Lighthouse documentation says the
same thing from the other side: the precomposed link "has been obsolete since iOS 7".

It isn't an unknown token. WebKit still parses `apple-touch-icon-precomposed` as a touch
icon type of its own, which is exactly why keeping it next to `apple-touch-icon` is a
problem rather than harmless noise. The page now declares its home-screen icon twice,
the two drift, and the next person to replace the icon has two places to change and no
way to tell from the markup which one a device will use.

## Use instead

One declaration, one 180×180 PNG:

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

Icons for an installable web app belong in the web app manifest as well; this link is
for iOS's home screen.

## Detectability

Fully detectable, but not with a selector: it's a document rule because it only fires
when a plain `apple-touch-icon` link also exists. A link whose `rel` carries both tokens
doesn't count as that plain link, since removing it would remove the page's only touch
icon. The rule does not report a lone precomposed link either. It is the page's only home-screen
icon, and no fix can rename a token.

The fix removes every precomposed link. Where the precomposed link points at the same
image as the plain one, or a smaller one, that changes nothing. There's one case it does
change: WebKit ranks touch icons by declared `sizes`, largest first, and prefers a
precomposed icon only when two are the same size. A precomposed link that is the
largest declared icon, or ties in size with a different image, is the one WebKit picks,
and after the fix the plain link's image is used instead. Check the sizes before applying
the fix to a page that declares more than one icon.

## Resources

- [Apple Developer: Configuring Web Applications (Safari Web Content Guide, archived)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html): "Safari on iOS 7 doesn't add effects to icons"; the precomposed suffix only mattered to older versions.
- [Chrome for Developers: Lighthouse: Does not provide a valid apple-touch-icon](https://developer.chrome.com/docs/lighthouse/pwa/apple-touch-icon): "A rel="apple-touch-icon-precomposed" link passes the audit, but it has been obsolete since iOS 7."
- [WebKit: `Source/WebCore/html/LinkIconCollector.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/LinkIconCollector.cpp): touch icons ordered largest first; "A Precomposed icon should come first if both icons have the same size."
- [WebKit: `Source/WebCore/html/LinkRelAttribute.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/LinkRelAttribute.cpp): the engine still parses `apple-touch-icon-precomposed` as its own icon type.
