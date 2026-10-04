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

## Why avoid

The HTML Standard: "The attribute's missing value default and invalid value default are both
the Auto state." Auto "Signals automatic determination of fetch priority", which is what the
browser does with no attribute. The page looks the same either way, so the typo survives.

## Use instead

```html
<img src="/hero.jpg" fetchpriority="high" alt="Roses in bloom">
<script src="/analytics.js" fetchpriority="low" async></script>
```

## Detectability

Detectable with one selector over `img`, `link` and `script`, the elements that carry the
attribute. It is an enumerated attribute: the keywords match without regard to ASCII case and
with no whitespace trimming, which is what `=` with the `i` flag does. An empty value stays
quiet: auto is its missing-value default, the same as omitting the attribute. There is no autofix: the intended keyword is the author's.

## Resources

- [HTML Standard: Fetch priority attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#fetch-priority-attributes): the three keywords, and an invalid value default of Auto.
- [MDN: fetchpriority](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority): the attribute on `img`, `link` and `script`; `auto` is "Used if no value or an invalid value is set".
