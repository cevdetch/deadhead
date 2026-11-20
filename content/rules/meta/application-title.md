---
ruleId: "meta/application-title"
title: "<meta name=\"application-title\">"
description: "A PWA title-bar hint that works in Chromium alone, with no standard behind it and no support in Firefox or Safari."
pubDate: "2026-09-19"
updatedDate: "2026-09-24"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="application-title" i]'
fix: { op: "remove-element" }
replacement: "Delete the element and name the installed app in the web app manifest."
tags: ["web-app"]
impacts: ["interop", "maintainability"]
related: ["meta/apple-mobile-web-app-capable", "meta/application-name"]
---

`<meta name="application-title">` puts custom text in the title bar of an installed web app. It works in Chromium and nowhere else: Firefox skips it in each release, and Safari skips it on macOS and iOS alike. The name appears in no standard and in no extension registry, so the manifest carries the app name instead.

## Why avoid

It is not a standard. The HTML Standard lists `application-name` among its standard metadata names with no row for `application-title`. The WHATWG MetaExtensions wiki lists `application-name` and `application-url` with no row for it either. MDN documents standard names, names from other specifications, and common extension names, with no mention of it.

Caniuse records support from Chrome 134, Edge 134, Opera 119, and Samsung Internet 29. Firefox stays unsupported in each release, and Safari with Safari on iOS stays unsupported in each release. A PWA that leans on the tag shows one title in Chromium and the default title in Firefox and Safari.

The tag duplicates the manifest. The manifest names the installed app through `name` and `short_name` on each engine that installs PWAs. Two sources for the app name drift apart with no warning, and markup alone never shows which source a given browser honors.

## Use instead

Delete the element. Name the app once in the manifest and link the manifest from `head`:

```html
<link rel="manifest" href="manifest.json">
```

```json
{
  "name": "Weather Wizard",
  "short_name": "Wizard",
  "display": "standalone"
}
```

## Detectability

Detectable with one selector. The rule matches `meta` elements whose `name` is `application-title`, with the `i` flag for case variants. `=` fits because `name` holds a single value, not a token set; `rel` uses `~=` for the opposite reason, as `link/image-src` records.

The fix removes the element. Where a browser renders the title-bar text from the tag, deleting the element reverts that title bar to the document title.

## Resources

- [caniuse: meta name="application-title"](https://caniuse.com/wf-meta-application-title): support from Chrome 134, Edge 134, Opera 119, and Samsung Internet 29; Firefox, Safari, and Safari on iOS unsupported.
- [Edge Demos: application-title](https://microsoftedge.github.io/Demos/pwa-application-title): Microsoft shows the tag setting title-bar content in an installed web app.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): the extension registry, with rows for `application-name` and `application-url` and none for `application-title`.
- [MDN: Web application manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest): the manifest `name` and `short_name` members hold the install-time app name.
