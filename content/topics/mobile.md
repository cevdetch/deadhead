---
description: "The viewport meta tag, the small-screen hints it replaced, and the viewport settings that stop people zooming in to read."
---

Phones lay out a page in a virtual window about 980 pixels wide unless the page says
otherwise, then shrink the result to fit the screen. The page says otherwise with one tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

That tag, which every mobile browser reads, replaced a handful of earlier hints that told one phone browser or another that a page
suited small screens. It also brought a way to do harm. `user-scalable=no` or a low
`maximum-scale` takes pinch-zoom away from everyone, including people who cannot read the
page without it, and fails
[WCAG 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).

Deadhead reports five, three of them harmful:

- [`head/viewport-missing`](/rules/head/viewport-missing): a page with no viewport tag, laid
  out at desktop width and shrunk.
- [`meta/viewport-user-scalable`](/rules/meta/viewport-user-scalable): zoom disabled, or
  capped below 2. In the
  [10,000 home pages](/blog/what-10000-home-pages-put-in-their-head) it was the most common
  harmful finding.
- [`meta/viewport-value`](/rules/meta/viewport-value): a key browsers drop, such as
  `minimal-ui`, or a value outside its form, such as a misspelt `intial-scale`. The setting
  silently does nothing.
- [`meta/handheld-friendly`](/rules/meta/handheld-friendly) and
  [`meta/mobile-optimized`](/rules/meta/mobile-optimized): hints for early phone browsers
  and Internet Explorer Mobile. Unnecessary, and deleted by the fix.

The harmful rules have no autofix: adding a viewport or changing a zoom setting changes the
layout, and that needs a person to check it. MDN's
[viewport reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)
lists the keys browsers support.
