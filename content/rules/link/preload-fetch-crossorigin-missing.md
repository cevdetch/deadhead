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

`as="fetch"` preloads data a script will request with `fetch()` or `XMLHttpRequest`: the JSON
behind a page's first render, a configuration file, a translation bundle. The preload starts the
download while the parser is still in the head, so the data is ready by the time the script asks
for it. That only works if the browser can match the two requests.

## Why avoid

The Fetch Standard gives a `fetch()` called with a URL the mode `cors`. The HTML Standard keys
each preload on "URL is url, destination is destination, mode is mode, and credentials mode is
credentialsMode", and a request whose key differs gets nothing from the preload. A `<link>` with
no `crossorigin` is in the No CORS state, so its request has the mode `no-cors`. The first copy
downloads at preload priority and goes unused, and the data the script waits on comes from the
second request. MDN: "`font` and `fetch` preloading requires the `crossorigin` attribute to be
set".

The mismatch holds on the same origin. The mode differs whether or not the file is cross-origin,
so a same-origin `/data.json` is fetched twice as well. The page works, which is why the mistake
survives: the data arrives, from a second request the preload did not serve. Chrome reports it
in the console: "A preload for '…' is found, but is not used because the request mode does not
match. Consider taking a look at crossorigin attribute." A few seconds after load it adds that
the resource "was preloaded using link preload but not used".

## Use instead

Add `crossorigin`, with the value that matches how the script sends credentials:

```html
<!-- Before: no-cors preload, CORS fetch, two downloads -->
<link rel="preload" href="/data.json" as="fetch">

<!-- After -->
<link rel="preload" href="/data.json" as="fetch" crossorigin>
<script type="module">
  const data = await fetch("/data.json").then((response) => response.json());
</script>
```

A bare `crossorigin` means `anonymous`, which sets the credentials mode to `same-origin`, the
same as a default `fetch()`, even on the same origin. A `fetch()` with `credentials: "include"`
needs `crossorigin="use-credentials"`; no `crossorigin` value matches one with
`credentials: "omit"`. A cross-origin file also needs CORS headers on the response, or the
`fetch()` fails whatever the preload does.

Keep `href` identical to the URL the script requests: a different query string or a trailing
slash is a different key. And preload only data the page uses in its first moments; anything
later can wait for the script.

## Detectability

Detectable with one selector, the shape of `link/preload-font-crossorigin-missing`: a `preload`
token in `rel`, `as="fetch"`, and no `crossorigin` at all. The CLI, the bookmarklet and the
ESLint plugin report the same findings, and none skips. A `crossorigin` value that differs from
what the script sends is out of scope, as is an `href` that differs from the script's URL: the
script is not in the markup. There is no autofix: the fix adds an attribute.

## Resources

- [HTML Standard: consume a preloaded resource](https://html.spec.whatwg.org/multipage/links.html#consume-a-preloaded-resource): preloads are keyed on URL, destination, mode and credentials mode.
- [HTML Standard: CORS settings attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes): a missing `crossorigin` is the No CORS state; `anonymous` sets the credentials mode to `same-origin`, `use-credentials` to `include`.
- [Fetch Standard: new Request()](https://fetch.spec.whatwg.org/#dom-request): a URL string sets the mode to `"cors"`, and the credentials mode defaults to `"same-origin"`.
- [MDN: rel=preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload#cors-enabled_fetches): `font` and `fetch` preloads need `crossorigin`, "even when the fetch is not cross-origin".
- [Chromium: `resource_fetcher.cc`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/platform/loader/fetch/resource_fetcher.cc): the console warnings for a preload "not used because the request mode does not match" and one "not used within a few seconds from the window's load event".
