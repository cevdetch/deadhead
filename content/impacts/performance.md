---
description: "Head markup that costs bytes, requests or render time: preloads that download twice or not at all, priority hints that miss, and dead hints."
---

The head decides what a page fetches first, so mistakes there cost time before anything is
on screen. The rules here report markup that makes the browser do work it then throws
away, or that asks for a speed-up the browser cannot give. They are about load order and
wasted requests, not about whether a page is heavy in general: deadhead lints markup, and a
large image or script is not a markup error.

Most of them are about resource hints, because a hint the browser cannot match is worse
than none. A preload is used only when the later request matches it exactly, so a font or
`fetch()` preload without `crossorigin`, or a `preload as="script"` for a module, downloads
the file twice. A preload without `as` fetches nothing, and a `modulepreload` with a
non-module `as` preloads nothing while Chromium still downloads the file. A misspelt
`fetchpriority`, or `high` on a lazy image, leaves the largest image on the page waiting.
Speculation rules that do not parse prefetch nothing, and an import map or speculation
rules given a `src` are skipped whole. A meta Content Security Policy stops Chromium's
preload scanner, so every subresource starts later than it would under a header policy.

The unnecessary ones cost less: hints no engine acts on any more, such as
`rel="subresource"` and `rel="prerender"`, cache pragmas, client-hint pragmas that only
Chromium reads and that never persist, and `nomodule` scripts that no current browser runs.

None of the harmful rules has an autofix, because each repair adds or changes an attribute.
The findings name the request that goes wrong; checking the page's waterfall in DevTools
shows the cost. The [resource hints](/topics/resource-hints) and [CORS](/topics/cors)
topics explain the mechanisms, and web.dev's
[preload guide](https://web.dev/articles/preload-critical-assets) covers when a preload
helps at all.
