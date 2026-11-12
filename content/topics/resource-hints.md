---
description: "Preload, prefetch, prerender and fetch priority hints: the ones that download twice, the ones that do nothing, and the ones Chrome removed."
---

Resource hints tell the browser about work it would discover too late: a font the CSS will
ask for, the image that is the largest thing on screen, the page a visitor will open next.
Done right, `<link rel="preload">`, `fetchpriority` and
[Speculation Rules](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API)
make a page faster. Done wrong, they cost bandwidth and priority while the page still waits.

The failures are quiet because a hint is advice the browser may drop. A preload without
`as` fetches nothing. A font or `fetch()` preload without `crossorigin`, or a `preload
as="script"` for a module, does not match the real request, so the file downloads twice. A
`fetchpriority` value other than `high`, `low` or `auto` is ignored, and `high` on a lazy
image applies to a request that starts late. Speculation rules that fail to parse are
dropped whole. Then there are hints from older drafts: `importance`, `rel="subresource"` and
`rel="prerender"`, which Chrome now maps to a prefetch with no render.

Deadhead reports twelve:

- Preloads that waste the download:
  [`link/preload-as-missing`](/rules/link/preload-as-missing),
  [`link/preload-font-crossorigin-missing`](/rules/link/preload-font-crossorigin-missing),
  [`link/preload-fetch-crossorigin-missing`](/rules/link/preload-fetch-crossorigin-missing),
  [`link/preload-module`](/rules/link/preload-module) and
  [`link/modulepreload-as-value`](/rules/link/modulepreload-as-value).
- Priority hints that do not apply:
  [`attr/fetchpriority-value`](/rules/attr/fetchpriority-value),
  [`attr/img-fetchpriority-loading`](/rules/attr/img-fetchpriority-loading) and
  [`attr/importance`](/rules/attr/importance).
- [`script/speculationrules-syntax`](/rules/script/speculationrules-syntax): rules that do
  not parse.
- Hints with no effect:
  [`link/prerender`](/rules/link/prerender), [`link/subresource`](/rules/link/subresource)
  and [`meta/http-equiv-x-dns-prefetch-control`](/rules/meta/http-equiv-x-dns-prefetch-control).

The harmful ones have no autofix: the repair adds or changes an attribute. The
[CORS](/topics/cors) topic explains the `crossorigin` cases.
