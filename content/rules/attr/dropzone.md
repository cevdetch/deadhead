---
ruleId: "attr/dropzone"
title: "<dropzone>"
description: "dropzone is obsolete; handle dragenter and dragover in script instead."
pubDate: "2026-09-21"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "[dropzone]"
fix: { op: "remove-attribute", attr: "dropzone" }
replacement: "Handle dragenter and dragover in script, then delete the hook: <div id=\"target\"></div>."
tags: ["scripting"]
impacts: ["maintainability"]
related: []
---

`dropzone` binds nothing. The HTML Standard lists the attribute as obsolete with one
replacement: "Use script to handle the dragenter and dragover events instead."

HTML5 drafts defined `dropzone` as a declarative drop target. Its value named the operation,
`copy`, `move` or `link`, and the kinds of data accepted, such as `s:text/plain` for strings or
`f:image/png` for files. The 2011 W3C draft already noted the alternative: "Instead of using the
dropzone attribute, a drop target can handle the dragenter event ... and the dragover event".

## Why avoid

whatwg/html#2402, "Remove the dropzone global attribute", merged on 2017-03-06, records why:
"dropzone failed to get traction among browser implementers. Having it in the specification is
confusing to Web developers who may attempt to use it, only to discover that it is not
supported." Safari and Chrome had shipped a prefixed `webkitdropzone`, and the pull request
notes that the prefixed version was "going away from Chrome". The standard now lists the
attribute among its non-conforming features.

A `dropzone="copy"` asks the browser for drop handling it never performs. An element marked with
it accepts no drop on its own; the drop target answers through its event handlers, with or
without the label. A reader who sees the attribute can believe the area already works as a drop
target.

## Use instead

Handle the events in script. Cancelling `dragover` marks the element as a drop target, and
`dropEffect` sets the operation the attribute used to declare:

```html
<!-- Before -->
<div dropzone="copy f:image/png">Drop an image here</div>

<!-- After -->
<div id="target">Drop an image here</div>
<script>
  const target = document.getElementById("target");
  target.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  target.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = [...event.dataTransfer.files].filter((f) => f.type === "image/png");
    // handle files
  });
</script>
```

Pair a drop area with an `<input type="file">` or a button, so that keyboard and touch users,
who cannot drag, can choose the same files.

## Detectability

Detectable with one selector: `[dropzone]`. Presence of the attribute is the whole verdict, so
no logic module exists. The CLI, the bookmarklet and the ESLint plugin report the same findings,
and none skips. The autofix removes the attribute, which no browser reads; the event handlers
are the author's to write. The selector names no tag, so the rule lands in the wildcard dispatch
bucket.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `dropzone` on all elements, "Use script to handle the dragenter and dragover events instead."
- [whatwg/html#2402: Remove the dropzone global attribute](https://github.com/whatwg/html/pull/2402): merged 2017-03-06; "dropzone failed to get traction among browser implementers", and the prefixed `webkitdropzone`.
- [W3C HTML5 (2011 draft): drag and drop](https://dev.w3.org/html5/spec-LC/dnd.html): the `dropzone` keywords, and "a drop target can handle the dragenter event" instead.
- [MDN: HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API): drop targets defined by handling `dragover` and `drop`.
