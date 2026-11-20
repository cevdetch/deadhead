---
ruleId: "attr/xmlns-prefix"
title: "[xmlns:*] prefix in HTML"
description: "xmlns:* declares no namespace in HTML; drop it, or declare RDFa prefixes with prefix."
pubDate: "2026-09-23"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "html, head, body, div, span, p, nav, ol, ul, li, section, article, header, footer, aside, main, svg"
match: "logic"
fix: { op: "none" }
replacement: "Delete declarations for prefixes the RDFa initial context predefines (og, dc, v, schema) or the page never uses; move the rest into prefix, as in <html prefix=\"fb: http://ogp.me/ns/fb#\">."
tags: ["social", "structured-data"]
impacts: ["maintainability"]
related: ["attr/data-vocabulary", "attr/svg-xlink", "attr/microdata-without-itemscope", "attr/head-profile"]
---

`xmlns:og` and `xmlns:fb` on `<html>` come from the XHTML era, when RDFa 1.0 borrowed XML
namespace declarations to bind its prefixes. The HTML parser never gave them meaning,
and RDFa 1.1 replaced them with the `prefix` attribute.

## Why avoid

In the HTML syntax a namespace declaration declares nothing. The HTML Standard lists the
namespaced attributes the syntax can express, `xlink:*`, `xml:lang`, `xml:space`, `xmlns`
and `xmlns:xlink`, and closes the list: "No other namespaced attribute can be expressed in
the HTML syntax." Its own example shows an `xmlns:cdr` that "has no effect (unlike in
XML)". On `<html>`, `xmlns:og` is a plain attribute with a colon in its name.

RDFa retired it. RDFa Core 1.1 states that "prefix mapping via @xmlns is deprecated, and
may be removed in a future version of this specification". HTML+RDFa 1.1 is the rule for
HTML pages: "Web page authors SHOULD NOT use @xmlns: to express prefix mappings in RDFa
1.1 documents", and conformance checkers "SHOULD generate warnings". The severity is
`deprecated` because RDFa processors still honour the old form for backward
compatibility; nothing breaks, and nothing in the browser reads it.

The common declarations are redundant besides. The RDFa 1.1 initial context predefines
`og`, `dc`, `v`, `schema`, `foaf` and `cc`, so `property="og:title"` resolves with no
declaration at all.

## Use instead

Declare nothing for prefixes the initial context predefines. Put the rest in `prefix`:

```html
<html lang="en" prefix="fb: http://ogp.me/ns/fb#">
```

On inline SVG pasted from an editor, drop `xmlns:inkscape`, `xmlns:sodipodi` and the
like together with the attributes and elements that use them.

## Detectability

Detectable with a selector plus logic. A colon cannot appear in the selector subset, so
the selector lists the elements that carry declarations in practice: `<html>` for `og:`
and `fb:`, the containers and lists RDFa 1.0 breadcrumbs declared `xmlns:v` on, and
inline `<svg>`. The logic in `packages/rules/logic/attr/xmlns-prefix.ts` reports an element
with any attribute whose name starts with `xmlns:`. One finding per element, however
many declarations it carries. The CLI, the bookmarklet and the ESLint plugin all report;
none skips. A declaration on an element outside the tag list goes unreported.

`xmlns:xlink` is exempt. The HTML syntax expresses it on foreign elements, SVG 2 governs
its conformance, and a standalone copy of the SVG still needs it while it uses
`xlink:href`, which `attr/svg-xlink` covers. The bare `xmlns` attribute is out of
scope: the HTML Standard allows it on HTML elements with the value
`http://www.w3.org/1999/xhtml`.

There is no autofix. RDFa processors still honour `xmlns:` prefixes, and `fb` is missing
from the initial context, so deleting `xmlns:fb` can change what a processor extracts.
The fix op for an attribute also takes one fixed name, and the rule covers any prefix.

## Resources

- [RDFa Core 1.1 (Third Edition)](https://www.w3.org/TR/rdfa-core/): W3C Recommendation, 2015-03-17; "prefix mapping via @xmlns is deprecated, and may be removed in a future version of this specification".
- [HTML+RDFa 1.1 §5](https://www.w3.org/TR/html-rdfa/): W3C Recommendation, 2015-03-17; "Web page authors SHOULD NOT use @xmlns:", and conformance checkers "SHOULD generate warnings".
- [HTML Standard §13.1.2.3: Attributes](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2): "No other namespaced attribute can be expressed in the HTML syntax", after the table that names `xmlns:xlink`.
- [W3C RDFa 1.1 initial context](https://www.w3.org/2011/rdfa-context/rdfa-1.1): predefines `og`, `dc`, `v`, `schema`, `foaf` and `cc`; `fb` is absent.
