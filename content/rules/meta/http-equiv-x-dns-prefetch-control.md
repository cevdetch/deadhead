---
ruleId: "meta/http-equiv-x-dns-prefetch-control"
title: "<meta http-equiv=\"x-dns-prefetch-control\">"
description: "Reported dns-prefetch values change nothing; delete the tag and let the default stand."
pubDate: "2026-09-14"
status: "avoid"
severity: "unnecessary"
standardsBasis: "browser-convention"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="x-dns-prefetch-control" i]'
match: "logic"
fix: { op: "none" }
replacement: "Delete the tag; where a behavior was intended, send the X-DNS-Prefetch-Control response header instead."
tags: ["http-equiv", "resource-hints"]
impacts: ["maintainability"]
related: ["meta/http-equiv-metadata-names", "meta/http-equiv-cache-pragmas"]
---

Only `content="off"` does anything; the rest is dead weight. DNS prefetching resolves
link domains before they are clicked, and browsers do
it by default. `x-dns-prefetch-control` exists for the one case that matters:
turning it `off` for privacy. The crawl finds ~200,000 tags. 99% say `on`,
the default restated, and most of the rest is empty or garbage no engine acts
on. Only ~1,700 say `off`, and the rule never reports those.

## Why avoid

99% restate the default. `content="on"` is what supporting browsers do when the
tag is absent, so the element is pure boilerplate: copied, like so much head
markup, because nothing visibly breaks.

The rest is garbage. Past the 1% that say `off`, what remains is empty or
invalid values no engine acts on. There is no third state that does something.

It is non-standard on both sides. MDN badges even the header form
Non-standard, and WHATWG has no pragma for it: whatwg/html#9473, labelled
`removal/deprecation`, asks to define it or remove it from implementations.
Firefox honors it over HTTP alone while Chromium honors both, so engines
disagree on the same tag.

The one working value is left alone. `off` is a documented privacy opt-out;
the rule never reports it, so every finding is dead weight deletable by hand.

## Use instead

Delete the tag. `content="on"` restates the default and empty or garbage values
were never acted on, so the tag itself goes away. Where a behavior was
intended, it moves to the response header:

```http
X-DNS-Prefetch-Control: off
```

That header is the documented opt-out for privacy-sensitive pages (and the
opt-in for HTTPS pages, where the default is no prefetching). Non-standard but
honored by Chromium and Firefox. Unlike the meta form, which only Chromium
reads.

If the actual goal was faster resolution of specific hosts, that is a different
and standard mechanism:

```html
<link rel="dns-prefetch" href="https://cdn.example.com">
```

`content="off"` tags stay silent and untouched: the rule never reports the one
value that opts anywhere.

## Detectability

Fully detectable. The rule matches the pragma name ASCII
case-insensitively, and the logic in
`packages/rules/logic/meta/http-equiv-x-dns-prefetch-control.ts` reports everything
except `content="off"`; absent or empty content does nothing and is reported.

There is no autofix. The brief shaped `remove-element`. On HTTPS Chromium
defaults to *no* prefetching and the tag opts in, so blanket removal changes
behavior, which the fix contract forbids. Report, confirm context, delete by
hand.

## Resources

- [MDN: `X-DNS-Prefetch-Control` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-DNS-Prefetch-Control): Non-standard badge; `on` is the absent-tag behavior, `off` the documented opt-out, and the meta example itself uses `off`.
- [Chromium `http_equiv.cc`](https://chromium.googlesource.com/chromium/src/+/bef297074c79524e33aaccb2c697ceec64faddb6/third_party/blink/renderer/core/loader/http_equiv.cc): implements the keyword with a case-insensitive pragma-name match.
- [Chromium: DNS Prefetching design doc](https://chromium.googlesource.com/playground/chromium-org-site/+/ecb8ee697ce367e3ba1e674999f3c32950fb5f83/developers/design-documents/dns-prefetching.md): HTTPS defaults to no prefetch; the tag can opt in on HTTPS or out on HTTP; an explicit opt-out sticks.
- [WHATWG html#9473: Define X-DNS-Prefetch-Control](https://github.com/whatwg/html/issues/9473): labelled `removal/deprecation`; "still needs to be defined (or removed from implementations)".
- [WHATWG html#6196: add pragma directive](https://github.com/whatwg/html/issues/6196): Firefox honors it over HTTP and not HTTPS.
- [You probably don't need http-equiv meta tags](https://rviscomi.dev/2023/07/you-probably-dont-need-http-equiv-meta-tags/): ~200k sites, 99% `on`, 1,688 `off`, rest garbage; "only use it with `off`".
