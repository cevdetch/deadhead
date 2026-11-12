---
ruleId: "meta/http-equiv-unregistered-pragmas"
title: "<meta http-equiv> unregistered value"
description: "A meta tag whose http-equiv value is no registered pragma keyword."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv]'
match: "logic"
fix: { op: "none" }
replacement: "Delete the tag. Send header work as a response header from the server."
tags: ["http-equiv"]
impacts: ["maintainability"]
related: ["meta/http-equiv-header-only-pragmas", "meta/http-equiv-cache-pragmas", "meta/http-equiv-origin-trial"]
---

A `meta` tag whose `http-equiv` value is no registered pragma keyword trips this rule. Such a
tag is dead weight.

`http-equiv` started as a request to the server. HTML 2.0 and 4.01 described it as a field that
HTTP servers could read to build response headers, so authors wrote whatever header they wanted
into it. The HTML Standard dropped that model: it turned the attribute into a closed, enumerated
list that the browser processes, and any other value is now a tag that asks for a header nobody
sends.

## Why avoid

WHATWG defines `http-equiv` as a closed table of seven keywords: `content-language`,
`content-type`, `default-style`, `refresh`, `set-cookie`, `x-ua-compatible` and
`content-security-policy`. A value outside that table maps to no state, so the parser runs no
pragma algorithm for the tag.

MDN warns that "Some browsers process additional headers that are not listed above", and that
since "unrecognized headers or invalid values are ignored, this can lead to inconsistent
behavior across browser implementations". It adds: "Do not set other security headers using
`<meta http-equiv=`, as this can lead to a false sense of security!" An unregistered tag can
behave one way in one engine and do nothing elsewhere, and a reader cannot tell which from the
markup.

The dead weight adds up. Values such as `cleartype` or `window-target` linger in old markup,
copied between templates with no documented reader. Each tag costs bytes and review time for
zero effect. In the top 10,000 crawl of 2026-10-04, 49 of the 4,570 home pages linted from their
served HTML carried one.

Many familiar values have rules of their own, with advice for each: cache fields go to
`meta/http-equiv-cache-pragmas`, response-header-only mechanisms such as `x-frame-options` to
`meta/http-equiv-header-only-pragmas`, Internet Explorer switches to
`meta/http-equiv-ie-pragmas`, and metadata names in the wrong attribute to
`meta/http-equiv-metadata-names`. This rule catches what is left. `origin-trial` has no WHATWG
entry either, yet Chromium and Firefox enroll trials from the tag;
`meta/http-equiv-origin-trial` owns it and reports a tag once its tokens expire.

## Use instead

Send header work as a response header. The server is the place where cache lifetimes, security
policy and trial tokens take effect:

```html
<!-- Before: values no browser reads -->
<meta http-equiv="cleartype" content="true">
<meta http-equiv="Window-Target" content="_top">
```

```http
Cache-Control: no-store
```

Keep `meta http-equiv` for the registered set alone. When a value looks like it should do
something, look it up before keeping it: if the feature it names exists as a header, the header
is the place for it; if it has no documented reader, delete the tag.

## Detectability

Each `meta` tag with an unregistered `http-equiv` value trips the rule. The `meta[http-equiv]`
selector is a prefilter alone: the verdict lives in
`packages/rules/logic/meta/http-equiv-unregistered-pragmas.ts`, which holds the seven-item
allowlist and flags the rest, minus every value another rule owns. The CLI, the bookmarklet and
the ESLint plugin report the same findings, and none skips. `onion-location` (read by Tor
Browser) and `x-pjax-version` (read by pjax) stay quiet. Values are trimmed of ASCII whitespace
and fold to ASCII lowercase before the check, so `CLEARTYPE` trips the rule while `Refresh`
stays quiet. The rule reports without autofixing: MDN notes that some browsers honour extra
values, so a tag can still do something in one engine.

## Resources

- [WHATWG HTML: pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv): the closed keyword table and the per-state processing model.
- [MDN: `<meta http-equiv>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/http-equiv): "Some browsers process additional headers that are not listed above", and the warning on security headers in `meta`.
- [HTML 4.01: the META element](https://www.w3.org/TR/html401/struct/global.html#edef-META): `http-equiv` as information servers "gather" for "HTTP response message headers".
