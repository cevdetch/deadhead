---
ruleId: "attr/importance"
title: "<importance> priority hint"
description: "importance was the origin-trial name of fetchpriority; no browser reads it, so it sets no priority at all."
pubDate: "2026-10-01"
status: "avoid"
severity: "deprecated"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "any"
selector: "img[importance], link[importance], script[importance], iframe[importance]"
fix: { op: "remove-attribute", attr: "importance" }
replacement: "Delete importance. To set a priority, write fetchpriority with the same value: <img src=\"/hero.jpg\" fetchpriority=\"high\" alt=\"\">."
tags: ["resource-hints"]
impacts: ["maintainability"]
related: ["attr/fetchpriority-value", "attr/img-fetchpriority-loading"]
---

`importance` sets no priority. It was the attribute name in Chrome's Priority Hints origin
trials, and the feature shipped as `fetchpriority`. A page still carrying `importance="high"`
gets the default priority.

## Why avoid

The blink-dev "Intent to Ship: Priority Hints": "The only change during the spec process was a
name change of the HTML/fetch attributes from "importance" to "fetchpriority" and "priority"."
Chromium's list of HTML attribute names carries `fetchpriority` and no `importance`, and the
HTML Standard defines `fetchpriority` alone. Firefox and Safari shipped `fetchpriority` and never
`importance`.

## Use instead

```html
<img src="/hero.jpg" fetchpriority="high" alt="Roses in bloom">
```

## Detectability

Detectable with one selector: `importance` on `img`, `link`, `script` or `iframe`, the elements
the origin trial covered, with any value. The fix removes the attribute, which no browser reads,
so no fetch changes. It does not add `fetchpriority`: that is the author's call.

## Resources

- [blink-dev: Intent to Ship: Priority Hints](https://groups.google.com/a/chromium.org/g/blink-dev/c/WS_ZBvTyvM4): the rename from `importance` to `fetchpriority` before shipping.
- [Chromium: html_attribute_names.json5](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/html_attribute_names.json5): `fetchpriority` is a known attribute; `importance` is not.
- [web.dev: Fetch Priority API](https://web.dev/articles/fetch-priority): the 2018 and 2021 origin trials "using the importance attribute".
- [HTML Standard: fetch priority attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#fetch-priority-attributes): the standard name is `fetchpriority`.
