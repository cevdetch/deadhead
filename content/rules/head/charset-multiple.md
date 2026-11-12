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

A document holds at most one `meta` charset declaration. Each declaration past the first trips
this rule.

The declaration tells the browser how to turn the page's bytes into characters. It is read in
two places: a prescan of the first bytes before parsing starts, and the parser when it reaches
the element. The two duplicates on a page can come from a layout and an included partial that
each open with `<meta charset>`, or from a full HTML document pasted into another one.

## Why avoid

The HTML Standard caps the count: "There must not be more than one meta element with a charset
attribute per document." It also forbids pairing one with the older form: "A document must not
contain both a meta element with an http-equiv attribute in the Encoding declaration state and a
meta element with the charset attribute present."

Only the first declaration decides. The prescan stops at the first encoding it finds, and gives
it a tentative confidence. When the parser reaches a `<meta charset>`, it changes the encoding
only while the confidence is tentative; a declaration that matches the encoding in use sets the
confidence to certain, and every later one is ignored. A `charset` in the HTTP `Content-Type`
header outranks all of them: the standard takes the transport layer's encoding "with the
confidence certain", and no `meta` changes it.

The extras still mislead. An editor chasing mojibake fixes the visible duplicate while the live
declaration stays wrong, and the page stays broken.

## Use instead

Keep a single declaration at the top of `head`, and delete the rest after confirming the
survivor matches the bytes on disk:

```html
<!-- Before: a layout and a partial each declare the encoding -->
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Guide</title>
  <meta charset="utf-8">
</head>

<!-- After -->
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Guide</title>
</head>
```

If a server sends `Content-Type: text/html; charset=utf-8`, the header decides and the `meta`
stays as a fallback for saved copies and local files. Keep the two in agreement. A partial that
renders inside another page should not carry its own `<meta charset>`; that belongs to the
document shell.

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector can
count to two. The logic in `packages/rules/logic/head/charset-multiple.ts` lists the
`meta[charset]` elements once and reports each one past the first. The check reads the tree,
never source offsets, so the CLI, the bookmarklet and the ESLint plugin report the same
findings. A `<meta http-equiv="Content-Type">` beside a `<meta charset>` is outside this count;
`meta/http-equiv-content-type` covers the older form. There is no autofix: which declaration
matches the bytes is for a person to confirm.

## Resources

- [WHATWG HTML: the meta element](https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element): "There must not be more than one meta element with a charset attribute per document", and no pairing with an `http-equiv` encoding declaration.
- [WHATWG HTML: determining the character encoding](https://html.spec.whatwg.org/multipage/parsing.html#determining-the-character-encoding): the transport layer's encoding "with the confidence certain", and the prescan of the first 1024 bytes.
- [WHATWG HTML: the "in head" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead): a `meta` with `charset` changes the encoding only "if the confidence is currently tentative".
- [WHATWG HTML: changing the encoding while parsing](https://html.spec.whatwg.org/multipage/parsing.html#changing-the-encoding-while-parsing): a matching encoding sets the confidence to certain.
- [MDN: `<meta>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta): the value has to be `utf-8`, inside the first 1024 bytes.
