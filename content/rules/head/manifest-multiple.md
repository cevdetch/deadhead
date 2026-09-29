---
ruleId: "head/manifest-multiple"
title: "more than one rel=manifest"
description: "HTML lets a browser use the first rel=manifest link alone, so every later one is never fetched or applied. Delete the extras."
pubDate: "2026-09-29"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "remove-element" }
replacement: "Keep the first <link rel=\"manifest\" href=\"/app.webmanifest\"> and delete the rest; browsers read the first alone."
tags: ["one-per-page"]
impacts: ["maintainability"]
related: ["head/base-multiple", "head/canonical-multiple"]
---

A document uses one web app manifest: the first `<link rel="manifest">`. Each manifest link
past the first trips this rule.

## Why avoid

HTML's `manifest` link type: "In any case, only the first link element in tree order whose
rel attribute contains the token manifest may be used." Chromium's `Document::LinkManifest()`
walks the children of `<head>`, returns the first link whose `rel` holds `manifest`, and
notes that "Others are ignored."

A second manifest link is never fetched, and an edit to it changes nothing. The first stays
in force, so the page installs and runs as before; the extra is dead markup that invites
edits in the wrong file.

## Use instead

One manifest link:

```html
<link rel="manifest" href="/app.webmanifest">
```

To serve a different manifest per locale or theme, change the one `href` on the server.

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector
can count to two. The logic in `packages/rules/logic/head/manifest-multiple.ts` lists the
links matching `link[rel~="manifest" i]` in tree order and reports each one past the first.
It reads the tree, never source offsets, so it reports in all three adapters. An empty `href`
belongs to `link/href-missing`.

Chromium looks at the children of `<head>` alone, so a manifest link in `<body>` is never
used there, even when it comes first in tree order. The rule counts in tree order, as HTML
does, and reports the later link in that case too.

The autofix removes a later link when every keyword in its `rel` is `manifest`. The check
drops the fix for a link such as `rel="manifest icon"`, since removing it would take a
working icon with it.

## Resources

- [HTML Standard: link type "manifest"](https://html.spec.whatwg.org/multipage/links.html#link-type-manifest): "In any case, only the first link element in tree order whose rel attribute contains the token manifest may be used."
- [Chromium: `Document::LinkManifest()` in `document.cc`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/dom/document.cc): the first `<head>` child link whose `rel` holds `manifest`, with "The first matching link element is used. Others are ignored."
