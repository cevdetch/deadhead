---
ruleId: "meta/google-value"
title: "<meta name=\"google\"> with an unsupported token"
description: "Google reads notranslate and nopagereadaloud under meta name=google. Any other token, retired or misspelt, does nothing."
pubDate: "2026-09-28"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="google" i]'
match: "logic"
fix: { op: "remove-element" }
replacement: "Keep notranslate or nopagereadaloud, one per tag: <meta name=\"google\" content=\"notranslate\">. Delete nositelinkssearchbox."
tags: ["i18n", "search"]
impacts: ["seo"]
related: ["meta/robots-value"]
---

`<meta name="google">` speaks to Google's own products. Google documents two tokens for it:
`nopagereadaloud` keeps Google's text-to-speech services from reading the page aloud, and
`notranslate` turns off Chrome's offer to translate it. Google ignores the meta tags it does
not support. Any other token does nothing, and a misspelt opt-out fails with no warning.

## Why avoid

The retired token is the common case. `nositelinkssearchbox` switched off the search box
Google showed under a site's result. Google announced the box's removal on 2024-10-21 and
dropped it from every result from 2024-11-21. Its page of supported tags now lists the token
as unused, "as the feature no longer exists".

The dangerous case is the typo. `notranlsate` leaves Chrome offering translation, and Google
Search free to show a translated title link that routes the visitor through Google Translate.
That is the outcome the author wrote the tag to stop. A robots rule under this name fails the
same way. Google reads robots rules under `robots`, `googlebot` and `googlebot-news`, so
`<meta name="google" content="noindex">` leaves the page in the index.

Chrome's reader is strict. It walks the `<meta>` children of `<head>`, requires the name
`google` in lowercase, and compares the whole `content` with `notranslate`, ignoring ASCII
case. `<meta name="Google" content="notranslate">` and
`content="notranslate, nopagereadaloud"` both leave translation on. This rule reports
neither, since each token in them is documented.

## Use instead

One documented token per tag:

```html
<meta name="google" content="notranslate">
<meta name="google" content="nopagereadaloud">
```

Delete `nositelinkssearchbox` outright. Google Search's page now shows `notranslate` under
`name="googlebot"`, and `meta/robots-value` accepts it there; Chrome reads it under
`name="google"` alone. Write robots rules under `<meta name="robots">`.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings; none skips. The selector prefilters to `meta[name="google" i]`.
The module in `packages/rules/logic/meta/google-value.ts` folds `content` to ASCII lowercase
and splits it on commas and ASCII whitespace. Google documents no separator for this name, so
the module splits as `meta/robots-value` does. A token other than `notranslate` or
`nopagereadaloud` trips the rule. A tag with no `content`, or with no tokens in it, stays
quiet. Chrome's older `value="notranslate"` form has no `content` and stays quiet too.

The autofix removes the element when every token is `nositelinkssearchbox`: that tag has no
reader left. Every other finding carries no fix. A typo stands for an intent the author has
to restore. Dropping the retired token from `nositelinkssearchbox, notranslate` would switch
Chrome's opt-out on, since Chrome honours `notranslate` as the whole content and in no other
form.

## Resources

- [Google Search Central: meta tags Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags): `<meta name="google" content="nopagereadaloud">`, `notranslate` shown under `name="googlebot"`, `nositelinkssearchbox` "is no longer used by Google Search ... as the feature no longer exists", and "Google will ignore meta tags that it doesn't support".
- [Google Search Central Blog: Farewell, Sitelinks Search Box (October 2024)](https://developers.google.com/search/blog/2024/10/sitelinks-search-box): "we'll be removing this visual element starting on November 21, 2024", "globally across all search results".
- [Chromium: `HasNoTranslate` in `web_language_detection_details.cc`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/exported/web_language_detection_details.cc): the `<meta>` children of `<head>` whose `name` is `google`, with `content` (or `value` when `content` is absent) equal to `notranslate` ignoring ASCII case.
- [Google Search Central: robots meta tag specifications](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): robots rules under `robots`, `googlebot` and `googlebot-news`; Google ignores other name values.
