---
ruleId: "attr/script-event-for"
title: "<script event, for>"
description: "event and for on script are obsolete; register listeners with addEventListener instead."
pubDate: "2026-09-21"
updatedDate: "2026-09-24"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "script[event], script[for]"
match: "logic"
fix: { op: "remove-attribute", attr: "event" }
replacement: "Move the code into a listener, target.addEventListener(\"click\", run), then delete the script block."
tags: ["microsoft", "scripting"]
impacts: ["maintainability"]
related: ["attr/contextmenu-onshow"]
---

`event` and `for` on `script` are IE's way of binding a script block to an element event. HTML keeps one rule for them: a classic script carrying both runs when `for` is `window` and `event` is `onload` or `onload()`, both as ASCII case-insensitive matches once surrounding whitespace is stripped, and is skipped otherwise. So the pair either disables the script or restates what the page already does on load.

## Why avoid

WHATWG lists both as obsolete with one replacement. Section 16.2 names `event` and `for` on `script` elements as obsolete: use DOM event registration instead. The HTML Standard's script-preparation steps say what the pair still does: with both present, "If for is not an ASCII case-insensitive match for the string "window", then return", and the same for an `event` that matches neither "onload" nor "onload()". A block written for `<button>` clicks never runs.

MDN names the live mechanism. Its `addEventListener` page calls the method the recommended way to register a listener, working on any event target with capture and once semantics the attributes never had. The old spelling cannot express either; the new one can, which is why migration changes capabilities instead of restating them.

## Use instead

Register the handler where handlers live:

```js
target.addEventListener("click", run);
```

## Detectability

Complete detection. The rule matches `script[event]` or `script[for]`: presence of either attribute is the whole verdict. A logic module decides only whether the autofix runs. It deletes `event` where the block runs the same without it: a lone `event`, a pair on a script that is not a classic script, such as a module, which that step skips, or a pair with `for` set to `window` and `event` set to `onload` or `onload()`. The fix names one attribute, so a lone `for`, or the one a fixed pair leaves behind, stays reported with no fix. On a classic script, a pair naming anything else keeps the block from running, and deleting `event` would run it on load, a behaviour change a fix must not make; that finding carries no fix, and a person has to decide whether the code should run and move it into `addEventListener`.

## Resources

- [WHATWG: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html): `event` and `for` on `script` are obsolete: DOM event registration.
- [HTML Standard: prepare the script element](https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element): a classic script with `event` and `for` stops before it runs unless `for` is `window` and `event` is `onload` or `onload()`.
- [MDN: `addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener): the recommended way to register a listener on any event target.
