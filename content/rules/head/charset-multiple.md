---
ruleId: "head/charset-multiple"
title: "more than one meta charset declaration"
description: "Only the first charset declaration decodes the page; a second one that names another encoding misleads every fix."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Keep a single declaration at the top of head: <meta charset=\"utf-8\">. Delete the rest after confirming the survivor matches the bytes on disk."
tags: ["charset", "one-per-page"]
impacts: ["interop", "maintainability"]
related: ["head/charset-position", "meta/charset-value"]
---

A document holds at most one `meta` charset declaration. Each declaration past the first trips this rule.

## Why avoid

The Standard caps the count at one and also forbids pairing a declaration with an `http-equiv` encoding form.

The prescan honors the first declaration it meets. Later ones meet a charset slot already set, so they never decode a byte.

The extras still mislead. An editor chasing mojibake fixes the visible duplicate while the live declaration stays wrong, and the page stays broken.

## Use instead

Keep a single declaration at the top of `head`:

```html
<meta charset="utf-8">
```

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector can count to two. The logic in `packages/rules/logic/head/charset-multiple.ts` lists the `meta[charset]` elements once and reports each one past the first. The check reads the tree, never source offsets, so it reports in all three adapters.

## Resources

- [WHATWG HTML: the meta element](https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element): no document holds more than one `meta` with a `charset` attribute, and none pairs one with an `http-equiv` encoding declaration.
- [WHATWG HTML: prescan a byte stream](https://html.spec.whatwg.org/multipage/parsing.html#prescan-a-byte-stream-to-determine-its-encoding): the first charset found sticks, since later ones meet a charset slot already set.
- [MDN: `<meta>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta): the value has to be `utf-8`, inside the first 1024 bytes.
