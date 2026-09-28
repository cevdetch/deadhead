---
ruleId: "attr/integrity-without-crossorigin"
title: "<link integrity> and <script integrity> without crossorigin"
description: "A cross-origin script or stylesheet with integrity and no crossorigin is fetched in no-cors mode, so the browser blocks it."
pubDate: "2026-09-28"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "partial"
kind: "element"
scope: "any"
selector: 'script[integrity]:not([crossorigin]), link[integrity][rel~="stylesheet" i]:not([crossorigin]), link[integrity][rel~="preload" i]:not([crossorigin]):not([as="font" i])'
match: "logic"
fix: { op: "none" }
replacement: "Add a bare crossorigin attribute and serve the file with Access-Control-Allow-Origin: <script src=\"https://cdn.example.com/lib.js\" integrity=\"sha384-…\" crossorigin></script>."
tags: ["cors"]
impacts: ["security"]
related: ["link/preload-font-crossorigin-missing", "link/preload-module"]
---

You add `integrity` to a CDN script and skip `crossorigin`. The browser fetches the
file in `no-cors` mode, the integrity check has no readable response to hash, and the
browser blocks the resource.

## Why avoid

You write `integrity` to make the browser refuse a response it cannot verify. HTML
assigns a missing `crossorigin` the No CORS state, and that state sends the request with
mode `no-cors`. A cross-origin `no-cors` response arrives opaque. Your page cannot read
those bytes, and the integrity algorithm cannot hash them.

MDN states the result: browsers refuse `no-cors` requests carrying subresource
integrity, so the request fails. Your script never runs. Code that depends on it throws.
Your stylesheet never applies. Visitors see a broken page, and the console holds the
error the markup never hints at.

You repair it with any `crossorigin` spelling. HTML maps an empty value and an invalid
keyword to the Anonymous state, so `crossorigin`, `crossorigin=""`, `anonymous` and a
typo all send a CORS request. `use-credentials` sends cookies and needs a host that
permits credentials.

## Use instead

Keep `integrity` and add `crossorigin`. Your host must send
`Access-Control-Allow-Origin`, or the CORS check fails in turn:

```html
<script src="https://cdn.example.com/lib.js" integrity="sha384-…" crossorigin></script>
<link rel="stylesheet" href="https://cdn.example.com/lib.css" integrity="sha384-…" crossorigin>
```

A module script skips both: `<script type="module" src="https://cdn.example.com/app.js" integrity="sha384-…"></script>` fetches in `cors` mode with no `crossorigin`.

## Detectability

Partial. Each finding carries `possible: true`. Markup cannot name the page origin, so
the rule reports URL shape: after trimming ASCII whitespace and stripping tabs and
newlines, `src` or `href` starts with `http://`, `https://` or `//`. Backslashes count
as slashes, as the URL parser reads them. A relative URL stays same-origin and never
reports. `data:` and `blob:` stay out.

A `<script>` reports only with `src` and a classic type. Module scripts fetch in `cors`
mode, and inline blocks and data blocks fetch nothing, so the shared `isClassicScript`
helper excludes them.

The `<link>` half covers `stylesheet` and `preload`. `modulepreload` fetches in `cors`
mode and stays out: `rel~="preload"` matches whole tokens. Font preloads stay out
because `link/preload-font-crossorigin-missing` reports each font preload without
`crossorigin`, and one element gets one finding.

There is no autofix. The repair adds an attribute, and each fix op subtracts. Deleting
`integrity` unblocks the resource and drops the hash check, a behaviour change and a
security downgrade.

## Resources

- [HTML Standard: CORS settings attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes): the missing value default is No CORS, and the invalid and empty defaults are Anonymous, which backs the decision that any `crossorigin` value counts.
- [HTML Standard: create a potential-CORS request](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#create-a-potential-cors-request): the request mode is `no-cors` when the CORS state is No CORS, and `cors` otherwise.
- [HTML Standard: the link element, `integrity`](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-integrity): the attribute belongs only on `link` elements whose `rel` holds `stylesheet`, `preload` or `modulepreload`, which sets the `<link>` half of the selector.
- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity): browsers refuse `no-cors` requests carrying integrity metadata, so such a request fails, and pages must include `crossorigin`.
- [MDN: HTML attribute `crossorigin`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin): an empty value equals `anonymous`, and an invalid keyword and an empty string map to the `anonymous` keyword, which confirms the bare replacement.
