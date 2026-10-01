---
ruleId: "link/preload-fetch-crossorigin-missing"
title: "<link rel=\"preload\" as=\"fetch\"> without crossorigin"
description: "fetch() requests run in CORS mode; a fetch preload without crossorigin does not match them, so the file is downloaded twice."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: 'link[rel~="preload" i][as="fetch" i]:not([crossorigin])'
fix: { op: "none" }
replacement: "Add crossorigin: <link rel=\"preload\" href=\"/data.json\" as=\"fetch\" crossorigin>. Use crossorigin=\"use-credentials\" if the fetch() sends credentials: \"include\"."
tags: ["cors", "resource-hints"]
impacts: ["performance"]
related: ["link/preload-font-crossorigin-missing", "link/preload-as-missing"]
---

A `<link rel="preload" as="fetch">` without `crossorigin` downloads the file twice. The preload
goes out in `no-cors` mode, the script's `fetch()` in CORS mode, and the browser hands a
preloaded response to a request with the same mode and no other.

## Why avoid

The Fetch Standard gives a `fetch()` called with a URL the mode `cors`. The HTML Standard keys
each preload on "URL is url, destination is destination, mode is mode, and credentials mode is
credentialsMode", and a request whose key differs gets nothing from the preload. The first copy
downloads at preload priority and goes unused, and the data the script waits on comes from the
second request. MDN: "`font` and `fetch` preloading requires the `crossorigin` attribute to be
set".

## Use instead

```html
<link rel="preload" href="/data.json" as="fetch" crossorigin>
```

A bare `crossorigin` means `anonymous`, which matches a default `fetch()` even on the same
origin. A `fetch()` with `credentials: "include"` needs `crossorigin="use-credentials"`.

## Detectability

Detectable with one selector, the shape of `link/preload-font-crossorigin-missing`: a `preload`
token in `rel`, `as="fetch"`, and no `crossorigin` at all. A `crossorigin` value that differs
from what the script sends is out of scope. There is no autofix: the fix adds an attribute.

## Resources

- [HTML Standard: consume a preloaded resource](https://html.spec.whatwg.org/multipage/links.html#consume-a-preloaded-resource): preloads are keyed on URL, destination, mode and credentials mode.
- [Fetch Standard: new Request()](https://fetch.spec.whatwg.org/#dom-request): a URL string sets the mode to `"cors"`.
- [MDN: rel=preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload#cors-enabled_fetches): `font` and `fetch` preloads need `crossorigin`, "even when the fetch is not cross-origin".
