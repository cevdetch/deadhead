---
ruleId: "attr/rev-urn"
title: "<a rev, urn>, <link rev, urn>"
description: "rev and urn on a and link are obsolete; rel with an opposite term replaces rev and href replaces urn, so delete them."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "a[rev], link[rev], a[urn], link[urn]"
fix: { op: "remove-attributes" }
replacement: "Delete the attributes. State the relationship with rel and the identifier with href: <a href=\"doc.html\" rel=\"author\">doc</a>."
tags: ["hyperlinks"]
impacts: ["maintainability"]
related: ["attr/methods"]
---

`rev` and `urn` on `a` and `link` describe nothing browsers act on. Both date from HTML 2.0:
`rev` stated the relationship in reverse, from the destination back to the current page, and
`urn` offered "a preferred, more persistent identifier" for the destination. The HTML Standard
lists both as obsolete on both elements, with a replacement for each.

RFC 1866 defined the pair in 1995. `rev` was "same as the REL attribute, but the semantics of
the relationship are in the reverse direction": a link from A to B with `rev="made"` said that B
made A. For `urn`, "the syntax and semantics of the URN attribute are not yet specified", and
they never were. HTML 4.01 kept `rev` and dropped `urn`.

## Why avoid

The HTML Standard names `rev` and `urn` on `a` and `link` elements among the non-conforming
features. For `rev`: "Use the rel attribute instead, with an opposite term. (For example,
instead of rev="made", use rel="author".)" For `urn`: "Specify the preferred persistent
identifier using the href attribute instead." Neither attribute drives any browser behaviour:
`rev` reverses nothing, and `urn` resolves nothing.

`rev` was also misread. MDN notes that the attribute "doesn't stand for "revision" and must not
be used with a version number, even though many sites misuse it in this way". A reverse relation
is hard to state and harder to consume: whoever reads it has to swap subject and object, and the
link types defined for `rel` are written for the forward direction. `rel="author"` says the same
thing as `rev="made"` with no inversion.

The W3C reference repeats each line per element. Its `a` page calls both attributes obsolete
with the same two directions, and its `link` page repeats them. MDN documents `rev` on `<link>`
with the note to "use the rel attribute with the opposite link type value", and does not
document `urn` at all.

## Use instead

State the relationship with `rel` in the forward direction, and put the identifier in `href`:

```html
<!-- Before -->
<link href="/about/ada" rev="made">
<a href="doc.html" urn="example:doc">doc</a>

<!-- After -->
<link href="/about/ada" rel="author">
<a href="urn:example:doc">doc</a>
```

Pick the `rel` value from the link types the HTML Standard defines, or the registered
extensions, so that the relation still means something to the software reading it. Where no
opposite term exists, drop the relation. A `urn:` URL in `href` names the resource, but browsers
do not resolve URNs, so a link meant to be followed keeps an `https:` URL in `href`.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. The rule matches `a[rev]`, `link[rev]`, `a[urn]` or `link[urn]`:
presence of either attribute is the whole verdict, so no logic module exists. The autofix
removes every attribute the rule names that is present on the element, and leaves every other
attribute as written; the bookmarklet reports without fixing.

Two readers survive. The HTML Standard keeps a reflected `rev` property on `HTMLAnchorElement`
and `HTMLLinkElement`, so a script that reads `link.rev` sees the empty string after the fix.
RDFa Core 1.1 "supports the use of @rel and @rev on any element" as a predicate attribute, so on
a page that publishes RDFa, removing `rev` changes the triples an RDFa processor extracts. Check
for both before applying the fix to such pages.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `rev` and `urn` on `a` and `link` elements are obsolete: opposite-term `rel` replaces `rev`, `href` replaces `urn`.
- [HTML Standard: Other elements, attributes and APIs](https://html.spec.whatwg.org/multipage/obsolete.html#other-elements,-attributes-and-apis): `HTMLAnchorElement` and `HTMLLinkElement` keep a reflected `rev`.
- [RFC 1866: HTML 2.0, section 5.7.3](https://www.rfc-editor.org/rfc/rfc1866#section-5.7.3): `REV` "in the reverse direction"; `URN` semantics "not yet specified".
- [MDN: `<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link): `rev` with the note to use `rel` with the opposite link type, and the warning that it does not mean "revision".
- [W3C: `a` reference](https://w3c.github.io/html-reference/a.html): both attributes obsolete on anchors with the same two directions.
- [RDFa Core 1.1](https://www.w3.org/TR/rdfa-core/): "RDFa supports the use of @rel and @rev on any element."
