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

A `meta` tag whose `http-equiv` value is no registered pragma keyword trips this rule. Such a tag is dead weight.

## Why avoid

WHATWG defines `http-equiv` as a closed table of seven keywords: `content-language`, `content-type`, `default-style`, `refresh`, `set-cookie`, `x-ua-compatible` and `content-security-policy`. A value outside that table maps to no state, so the parser runs no pragma algorithm for the tag.

MDN warns that some browsers honour extra headers beyond the list while others skip them, so an unregistered tag behaves one way in one engine and another way elsewhere. MDN also warns against placing security headers in `meta http-equiv`: the tag looks like protection while it grants none.

The dead weight adds up. Stale names such as `pragma`, `expires` or `pics-label` linger in old markup long after servers stop sending the matching headers. Each tag costs bytes and review time for zero effect.

`origin-trial` has no WHATWG entry either, yet Chromium and Firefox enroll trials from the tag. `meta/http-equiv-origin-trial` owns it and reports a tag once its tokens expire.

## Use instead

Send header work as a response header. The server is the place where cache lifetimes, security policy and trial tokens take effect.

```http
Cache-Control: no-store
```

Keep `meta http-equiv` for the registered set alone.

## Detectability

Each `meta` tag with an unregistered `http-equiv` value trips the rule. The `meta[http-equiv]` selector is a prefilter alone: the verdict lives in `packages/rules/logic/meta/http-equiv-unregistered-pragmas.ts`, which holds the seven-item allowlist and flags the rest. `onion-location` (read by Tor Browser) and `x-pjax-version` (read by pjax) stay quiet. Values fold to ASCII lowercase before the check, so `PRAGMA` trips the rule while `Refresh` stays quiet. The rule reports without autofixing: MDN notes that some browsers honour extra values, so a tag can still do something in one engine.

## Resources

- [WHATWG HTML: pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv): the closed keyword table and the per-state processing model.
- [MDN: `<meta http-equiv>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/http-equiv): the supported subset, the ignored remainder and the warning on security headers in `meta`.
