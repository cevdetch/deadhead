---
ruleId: "attr/fetchpriority-value"
title: "<fetchpriority> other than high, low or auto"
description: "A fetchpriority value other than high, low or auto falls back to auto, and the priority the author asked for is lost."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: 'img[fetchpriority]:not([fetchpriority="high" i]):not([fetchpriority="low" i]):not([fetchpriority="auto" i]):not([fetchpriority=""]), link[fetchpriority]:not([fetchpriority="high" i]):not([fetchpriority="low" i]):not([fetchpriority="auto" i]):not([fetchpriority=""]), script[fetchpriority]:not([fetchpriority="high" i]):not([fetchpriority="low" i]):not([fetchpriority="auto" i]):not([fetchpriority=""])'
fix: { op: "none" }
replacement: "Write high, low or auto: <img src=\"/hero.jpg\" fetchpriority=\"high\" alt=\"Roses in bloom\">."
tags: ["resource-hints"]
impacts: ["performance"]
related: ["attr/img-fetchpriority-loading"]
---

A `fetchpriority` value other than `high`, `low` or `auto` does nothing. The HTML Standard maps
any other value to the Auto state, the same as no attribute, so `fetchpriority="hight"` on a
hero image throws away the boost the author asked for, and nothing warns them.

`fetchpriority` adjusts the priority a browser gives a fetch relative to other fetches of the
same kind. It goes on `<img>`, `<link>` and `<script>`, and the same three keywords serve the
`priority` option of `fetch()`. Chrome and Edge shipped it in version 101, Safari in 17.2 and
Firefox in 132; it is Baseline since October 2024.

## Why avoid

The HTML Standard: "The attribute's missing value default and invalid value default are both the
Auto state." Auto "Signals automatic determination of fetch priority", which is what the browser
does with no attribute. The page looks the same either way, so the typo survives.

The values that fail are the ones that look plausible: `hight`, `highest`, `important`, `true`,
or a value copied with a stray space, such as `" high"`. The keywords ignore ASCII case and are
not trimmed, so `HIGH` works and `" high"` does not.

The loss is invisible in testing. The image or script still loads, at the default priority, and
the page renders. For a hero image that default is the problem the attribute was there to solve:
web.dev describes Chrome starting images at "Low" priority and boosting those in the viewport to
"High" at layout time. The attribute moves the hero up from the start. web.dev reports Google
Flights' Largest Contentful Paint falling from 2.6 s to 1.9 s with a high priority on its LCP
image. A misspelt value gives that back.

Script sees the same fallback. The `fetchPriority` IDL attribute reflects the content attribute
"limited to only known values", so `img.fetchPriority` returns `"auto"` for
`fetchpriority="hight"`. That is a quick check in the console, and a way for a test to catch the
typo.

## Use instead

One of the three keywords, in any case, with no surrounding spaces:

```html
<!-- Before: both values fall back to auto -->
<img src="/hero.jpg" fetchpriority="hight" alt="Roses in bloom" width="1200" height="600">
<script src="/analytics.js" fetchpriority="lowest" async></script>

<!-- After -->
<img src="/hero.jpg" fetchpriority="high" alt="Roses in bloom" width="1200" height="600">
<script src="/analytics.js" fetchpriority="low" async></script>
```

The attribute is a hint. MDN notes that both the internal priority and the effect of
`fetchpriority` on it are browser dependent, and that the attribute "should be used sparingly":
marking every image `high` leaves the browser no way to tell which one matters. Keep `high` for
the image expected to be the Largest Contentful Paint element, and leave `loading="lazy"` off
that image (see `attr/img-fetchpriority-loading`).

## Detectability

Detectable with one selector over `img`, `link` and `script`, the elements that carry the
attribute. The CLI, the bookmarklet and the ESLint plugin report the same findings, and none
skips. It is an enumerated attribute: the keywords match without regard to ASCII case and with
no whitespace trimming, which is what `=` with the `i` flag does. An empty value stays quiet:
auto is its missing-value default, the same as omitting the attribute. `fetchpriority` on
another element, such as `<iframe>`, is outside the HTML Standard and outside this rule. There
is no autofix: the intended keyword is the author's.

## Resources

- [HTML Standard: Fetch priority attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#fetch-priority-attributes): the three keywords, and an invalid value default of Auto.
- [HTML Standard: the `link` element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): "The fetchPriority IDL attribute must reflect the fetchpriority content attribute, limited to only known values." `img` and `script` carry the same line.
- [MDN: fetchpriority](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority): the attribute on `img`, `link` and `script`; `auto` is "Used if no value or an invalid value is set"; the effect is browser dependent and the attribute "should be used sparingly"; Baseline 2024.
- [web.dev: Optimize resource loading with the Fetch Priority API](https://web.dev/articles/fetch-priority): "a hint, not a directive"; images "start at 'Low' priority by default"; the Google Flights LCP result; the `priority` option of `fetch()`.
- [MDN browser-compat-data: `html.elements.img.fetchpriority`](https://github.com/mdn/browser-compat-data/blob/main/html/elements/img.json): Chrome and Edge 101, Firefox 132, Safari 17.2.
