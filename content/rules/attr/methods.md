---
ruleId: "attr/methods"
title: "<a methods>, <link methods>"
description: "methods on a and link is obsolete; the server answers capability questions over HTTP OPTIONS, so delete the attribute."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "a[methods], link[methods]"
fix: { op: "remove-attribute", attr: "methods" }
replacement: "Delete the attribute: <a href=\"page.html\">text</a>. A client that needs the communication options sends OPTIONS to the target resource."
tags: ["hyperlinks"]
impacts: ["maintainability"]
related: ["attr/charset-obsolete"]
---

`methods` on `a` and `link` answers a question no browser asks. HTML 2.0 defined it in 1995 as
an advisory list of the operations the link's destination supported, and the HTML Standard lists
it as obsolete on both elements, with the HTTP OPTIONS feature as the replacement.

RFC 1866, the HTML 2.0 specification, gave the attribute a speculative use: METHODS "specifies
methods to be used in accessing the destination", and "the HTML user agent may chose a different
rendering as a function of the methods allowed; for example, something that is searchable may
get a different icon." HTML 4.01 no longer listed it, and no current browser reads it.

## Why avoid

The HTML Standard names `methods` on `a` elements and `methods` on `link` elements among the
non-conforming features: "Use the HTTP OPTIONS feature instead." No IDL member reflects it: the
obsolete `HTMLAnchorElement` members the standard keeps are `coords`, `charset`, `name`, `rev`
and `shape`, and `methods` is not among them. It was documentation stapled to markup, unread by
the machinery it described.

It can also mislead. A value such as `methods="GET HEAD"` reads as a statement about the server,
and nothing keeps it in step with what the server allows. When the two disagree, the markup is
the one that is wrong, and no tool checks it.

RFC 9110 defines the live channel. The OPTIONS method "requests information about the
communication options available for the target resource", and the server's response can list the
supported methods in the `Allow` header field. The capability question the attribute posed still
has an answer; it arrives over HTTP, not in the linking page.

## Use instead

Delete the attribute and let the protocol answer:

```html
<!-- Before -->
<a href="page.html" methods="GET HEAD">text</a>
<link href="main.css" rel="stylesheet" methods="GET">

<!-- After -->
<a href="page.html">text</a>
<link href="main.css" rel="stylesheet">
```

A client that needs the options asks the server, and reads `Allow` from the response:

```http
OPTIONS /page.html HTTP/1.1
Host: example.com
```

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. The rule matches `a[methods]` or `link[methods]`: presence of the
attribute is the whole verdict, so no logic module exists. Both alternatives name the same
attribute, so the single `remove-attribute` fix covers every finding; no browser reads the
value, so the removal changes nothing a visitor sees. The bookmarklet reports without fixing, as
for every rule.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `methods` on `a` and `link` elements is obsolete: "Use the HTTP OPTIONS feature instead."
- [HTML Standard: Other elements, attributes and APIs](https://html.spec.whatwg.org/multipage/obsolete.html#other-elements,-attributes-and-apis): the obsolete `HTMLAnchorElement` members, with no `methods`.
- [RFC 1866: HTML 2.0, section 5.7.3](https://www.rfc-editor.org/rfc/rfc1866#section-5.7.3): METHODS "specifies methods to be used in accessing the destination", advisory.
- [HTML 4.01: Index of attributes](https://www.w3.org/TR/html401/index/attributes.html): no `methods` attribute.
- [RFC 9110: OPTIONS](https://www.rfc-editor.org/rfc/rfc9110#name-options): the OPTIONS method "requests information about the communication options available for the target resource", answered with `Allow`.
