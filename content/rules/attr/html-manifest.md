---
ruleId: "attr/html-manifest"
title: "<html manifest>"
description: "manifest on html points at a removed offline cache; serve offline through a service worker instead."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "html[manifest]"
fix: { op: "remove-attribute", attr: "manifest" }
replacement: "Delete the attribute: <html lang=\"en\">. Register a service worker to serve the page offline."
tags: ["caching"]
impacts: ["maintainability"]
related: ["attr/html-version"]
---

`manifest` on `html` enrolls the page in the application cache, which no browser has any more.
The HTML Standard lists the attribute as obsolete with one replacement, service workers, so the
pointer names a file nothing fetches.

The application cache, or AppCache, was HTML5's first offline mechanism. A `manifest` file
listed the URLs to keep, and the browser served them from the cache on later visits. WebKit's
account of its removal: "there was no mechanism for cache busting, and that made both developing
a site and evolving the site over time quite frustrating. AppCache also had security
challenges." Service workers replaced it with a script that decides, request by request, what to
serve.

## Why avoid

The HTML Standard's list of non-conforming features names `manifest` on `html` elements: "Use
service workers instead."

The browsers removed the cache. web.dev's removal notice records the timeline: "Chrome 85
removes support for AppCache by default", a reverse origin trial kept it alive for enrolled
sites until "October 5th, 2021 (roughly Chrome 95)", Firefox "deprecated AppCache in release 44
(September 2015)" and removed it from Beta and Nightly builds in September 2019. WebKit removed
it from Safari 15.0 in 2021, and Safari 18.0 "removes the last bits of support". In a current
browser the attribute triggers no download of the manifest and no cache. A page that still
carries it works online and has no offline support, whatever the attribute suggests.

The file it names can mislead too. A `.appcache` manifest left on the server looks like working
offline configuration to anyone maintaining the site, and keeping its URL list in step with the
build is wasted effort.

## Use instead

Delete the attribute, and the manifest file with it. If the page needs to work offline, register
a service worker:

```html
<!-- Before -->
<html lang="en" manifest="app.appcache">

<!-- After -->
<html lang="en">
<script>
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
</script>
```

The worker script decides which requests to cache and when to update, which AppCache did with
fixed rules. A web app manifest, `<link rel="manifest" href="/app.webmanifest">`, is a different
file with a similar name: it describes how an installed app looks and starts, and caches
nothing.

## Detectability

Detectable with one selector: `html[manifest]`. Presence of the attribute is the whole verdict,
so no logic module exists. The CLI, the bookmarklet and the ESLint plugin report the same
findings, and none skips. The autofix removes the attribute, which no current browser acts on;
the manifest file on the server is outside the linter's reach.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `manifest` on `html` elements, "Use service workers instead."
- [web.dev: Preparing for AppCache removal](https://web.dev/articles/appcache-removal): removal by default in Chrome 85, the reverse origin trial to October 2021, Firefox's deprecation in release 44 and Safari's in early 2018.
- [WebKit: features in Safari 18.0](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/): AppCache removed from Safari 15.0 in 2021, the last bits in 18.0; "no mechanism for cache busting".
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API): the replacement for offline support.
