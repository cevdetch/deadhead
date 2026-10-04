---
ruleId: "meta/viewport-value"
title: "<meta name=\"viewport\"> with an unknown key or value"
description: "You write a viewport key browsers drop or a value outside its form, so the width or zoom you ask for never takes effect."
pubDate: "2026-09-28"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="viewport" i]'
match: "logic"
fix: { op: "none" }
replacement: "Fix the key or value in place: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."
tags: ["mobile"]
impacts: ["a11y", "interop"]
related: ["meta/viewport-user-scalable", "head/viewport-missing"]
---

You add `minimal-ui` to your viewport and nothing changes. You mistype `initial-scale` as `intial-scale` and the start zoom drifts. Browsers drop unknown keys and values outside form with no warning in the markup.

## Why avoid

An unknown key never takes effect. Chromium logs `The key "%replacement1" is not recognized and ignored` and moves on. WebKit reports `UnrecognizedViewportArgumentKey` on the same path. The page runs with the default for that key. A typo such as `intial-scale=1` leaves the start zoom at whatever the browser picks. `target-densitydpi` draws a warning and no effect. `minimal-ui` changes nothing in either engine: Chromium carries the comment `Ignore vendor-specific argument`, WebKit carries `Ignore silently for now`. `shrink-to-fit` is WebKit's own key: WebKit parses it and applies it to how a page shrinks to fit, and Chromium ignores it.

A malformed value misses the same way. `width=bogus` resolves to `auto`, so the layout viewport falls back to the desktop-width path and media queries for narrow screens never fire. `width=0` falls outside the documented floor of 1. `width=600px` carries trailing junk past the numeric prefix. `initial-scale=bogus` resolves to `auto`, so the start zoom drifts. `viewport-fit=bogus` falls back to `auto`, so a notched phone letterboxes a page meant to run edge to edge. `interactive-widget=bogus` falls back to `resizes-visual`, so a keyboard overlays content meant to shrink.

You see a page that renders with no error and feels wrong on phones alone. The tag sits in `head`, the miss hides in one pair of `content`, and the next person to touch the markup has no signal for which pair failed.

## Use instead

Use the eight documented keys with values in form:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="viewport" content="width=device-width, viewport-fit=cover">
<meta name="viewport" content="interactive-widget=resizes-content">
```

Drop `minimal-ui` and `target-densitydpi`. They change nothing in current engines. Fix typo keys. Keep widths and heights at `device-width` or `device-height` or a whole number from 1 to 10000, scales at a number from 0.0 to 10.0, `user-scalable` and `shrink-to-fit` at `yes`, `no`, `device-width`, `device-height` or a number, `interactive-widget` at `resizes-visual`, `resizes-content` or `overlays-content`, `viewport-fit` at `auto`, `contain` or `cover`.

## Detectability

Detectable in full. The selector pre-filters viewport meta elements and the logic parses `content` the way browsers parse it. Pairs split on commas, semicolons or whitespace, with whitespace around `=` folded away first. Keys match in any letter case, and a later pair overrides an earlier one.

The logic reports an unknown key, including `minimal-ui`, `target-densitydpi` and typos such as `intial-scale`. It reports a value outside form for each known key, including trailing junk such as `width=600px` and negatives. For `maximum-scale` it skips `yes` and `no`: `meta/viewport-user-scalable` owns those zoom-blocking tokens. For `user-scalable` and `shrink-to-fit` it reports a value that is no switch; numbers are switches, and whether one blocks zoom is `meta/viewport-user-scalable`'s call.

There is no autofix. The fault sits in one pair of `content`, which no fix op edits, and deleting the element throws away the `width=device-width` the layout needs.

## Resources

- [MDN: `<meta name="viewport">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport): the eight keys with their value forms.
- [CSS Viewport Module Level 1: viewport meta](https://drafts.csswg.org/css-viewport/#viewport-meta): the recognised properties and the parsing algorithm.
- [Chromium: `html_meta_element.cc`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/html_meta_element.cc): unknown keys, `target-densitydpi`, `minimal-ui`, `viewport-fit` and `interactive-widget` handling.
- [WebKit: `ViewportArguments.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/ViewportArguments.cpp): unknown keys, `minimal-ui`, `shrink-to-fit`, `viewport-fit` and `interactive-widget` handling.
