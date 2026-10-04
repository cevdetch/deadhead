---
ruleId: "meta/http-equiv-x-dns-prefetch-control"
title: "<meta http-equiv=\"x-dns-prefetch-control\">"
description: "content=\"on\" or an empty value changes nothing in any engine: Firefox reads the tag only to opt out, Chromium not at all."
pubDate: "2026-09-14"
status: "avoid"
severity: "unnecessary"
standardsBasis: "browser-convention"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="x-dns-prefetch-control" i]'
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete the tag. To resolve a host early use <link rel=\"dns-prefetch\" href=\"https://cdn.example.com\">; to opt out keep content=\"off\"."
tags: ["http-equiv", "resource-hints"]
impacts: ["maintainability"]
related: ["meta/http-equiv-metadata-names", "meta/http-equiv-cache-pragmas"]
---

`content="on"`, an empty value or a missing `content` changes nothing in any engine. Firefox
reads the pragma only to turn DNS prefetching off, never on, and Chromium sets a flag that
nothing reads. An HTTP Archive analysis counted about 200,000 of these tags, 99% of them `on`.

## Why avoid

Neither engine acts on `on`. Firefox keeps prefetching allowed for an empty value or `on`, turns
it off for any other value, and applies the pragma only while prefetching is still allowed: on
HTTPS, where Firefox starts with it off, `on` cannot turn it back on. Chromium enables a document
flag for `on`, and no current code reads that flag except a child frame copying it.
`rel="dns-prefetch"` links check the browser setting alone, and link-hover prefetching is gone.

It is non-standard on both sides. MDN badges even the header form Non-standard, and WHATWG has no
pragma for it: whatwg/html#9473, labelled `removal/deprecation`, asks to define it or remove it.

Other values are opt-outs. Firefox reads `off`, and every value but `on` or empty, as turning
prefetching off, so the rule leaves them alone.

## Use instead

Delete the tag. To resolve a specific host early, name it:

```html
<link rel="dns-prefetch" href="https://cdn.example.com">
```

To opt out for privacy, keep `content="off"` or send the header:

```http
X-DNS-Prefetch-Control: off
```

## Detectability

Fully detectable. The rule matches the pragma name ASCII case-insensitively, and the logic in
`packages/rules/logic/meta/http-equiv-x-dns-prefetch-control.ts` reports `content="on"` in any
case, an empty value and a missing `content`. Neither engine trims the value, so a padded
`" on "` is an opt-out in Firefox and stays quiet. The autofix deletes what the rule reports,
since no engine acts on it.

## Resources

- [Firefox `Document.cpp`](https://hg.mozilla.org/mozilla-central/file/11022e1a677f0dd83f348d52bd2b17c8410e3fab/dom/base/Document.cpp): while prefetching is allowed, the pragma keeps it allowed for an empty value or `on` and turns it off for anything else; HTTPS starts with it off.
- [Chromium `document.cc`](https://chromium.googlesource.com/chromium/src/+/11b8d4077ee17546b29271c3edfe839a3000965c/third_party/blink/renderer/core/dom/document.cc): `InitDNSPrefetch` enables the flag on http alone; `ParseDNSPrefetchControlHeader` sets it for `on` and clears it, for good, for anything else.
- [Chromium `preload_helper.cc`](https://chromium.googlesource.com/chromium/src/+/c618062d4798e8f4d2982a1cc2e71d45e211b4e9/third_party/blink/renderer/core/loader/preload_helper.cc): `rel="dns-prefetch"` checks the browser setting, never the document flag.
- [MDN: `X-DNS-Prefetch-Control` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-DNS-Prefetch-Control): Non-standard badge, and `off` as the documented opt-out.
- [WHATWG html#9473: Define X-DNS-Prefetch-Control](https://github.com/whatwg/html/issues/9473): labelled `removal/deprecation`; "still needs to be defined (or removed from implementations)".
- [You probably don't need http-equiv meta tags](https://rviscomi.dev/2023/07/you-probably-dont-need-http-equiv-meta-tags/): ~200k sites, 99% `on`, 1,688 `off`.
