---
ruleId: "attr/head-profile"
title: "<head profile>"
description: "profile on head is unnecessary; register meta names instead and trigger behaviors with link elements."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "head"
selector: "head[profile]"
fix: { op: "remove-attribute", attr: "profile" }
replacement: "Delete the attribute: <head>. Register metadata names instead, and use link elements to trigger behaviors."
tags: ["structured-data"]
impacts: ["maintainability"]
related: ["attr/meta-scheme"]
---

`profile` on `head` points at nothing that reads it. The HTML Standard calls the attribute
unnecessary, and says its IDL attribute is "intentionally omitted", so implementations "would
therefore not support this attribute".

HTML 4.01 introduced it for metadata. A profile was "a reference lexicon" that defined which
`meta` names a page used and what their values meant, and `profile` on `head` pointed at it: "a
profile designed to help search engines index documents might define properties such as
"author", "copyright", "keywords"". Microformats later reused the attribute to announce which
formats a page contained, as in `<head profile="http://gmpg.org/xfn/11">` for XFN. Neither use
was ever read by a browser.

## Why avoid

The HTML Standard's list of non-conforming features names `profile` on `head` elements:
"Unnecessary. Omit it altogether." For implementations it adds: "The profile IDL attribute on
head elements (with the HTMLHeadElement interface) is intentionally omitted. Unless so required
by another applicable specification, implementations would therefore not support this
attribute." There is no `head.profile` for script, and no processing for the URI.

The W3C HTML5 Recommendation split the replacement by intent. Where the attribute declared which
meta terms the document used, it was unnecessary: register the names. Where it was meant to
trigger behaviour in a user agent, use a `link` element. Either intent has a live mechanism; the
attribute serves neither. The microformats community made the same move and documents
`rel="profile"` links as its replacement for HTML5, where `<head profile>` is gone.

## Use instead

Delete the attribute. Keep `meta` names that are standard or registered, so that their meaning
does not depend on a profile:

```html
<!-- Before -->
<head profile="http://gmpg.org/xfn/11">
  <meta name="author" content="Example">
</head>

<!-- After -->
<head>
  <meta name="author" content="Example">
</head>
```

The HTML Standard defines a few names itself (`application-name`, `author`, `description`,
`generator`, `keywords`, `referrer`, `theme-color`, `color-scheme`) and points to the WHATWG
wiki's MetaExtensions page for others, which anyone can edit to record a name. Where a profile
announced a vocabulary to a consumer that still exists, structured data with its own context,
such as JSON-LD with a schema.org `@context`, carries that declaration inside the data.

## Detectability

Detectable with one selector: `head[profile]`. Presence of the attribute is the whole verdict,
so no logic module exists. The CLI, the bookmarklet and the ESLint plugin report the same
findings, and none skips. The autofix removes the attribute, which no browser reads, so nothing
changes.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `profile` on `head` elements, "Unnecessary. Omit it altogether."; the IDL attribute "is intentionally omitted".
- [HTML 4.01: the HEAD element](https://www.w3.org/TR/html401/struct/global.html#adef-profile): the `profile` attribute, and the "reference lexicon" a profile names.
- [microformats wiki: profile URIs](https://microformats.org/wiki/profile-uris): `<head profile>` for HTML 4 and XHTML 1, and `rel="profile"` links for HTML5.
- [W3C HTML5: obsolete features](https://www.w3.org/TR/2014/REC-html5-20141028/obsolete.html): unnecessary for declaring meta terms, with names registered instead, and `link` for behaviours.
- [HTML Standard: standard metadata names](https://html.spec.whatwg.org/multipage/semantics.html#standard-metadata-names): the names HTML defines; "consulting the WHATWG Wiki MetaExtensions page is encouraged" for others.
