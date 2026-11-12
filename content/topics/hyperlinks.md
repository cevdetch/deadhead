---
description: "Attributes and rel keywords on a, area and link that no longer shape a link, and the referrer setting that fails open when misspelt."
---

A hyperlink in HTML is mostly `href` and `rel`. Earlier versions gave links much more to
say: `rev` for the reverse relation, `urn`, `methods` and `charset` describing the target,
`coords` and `shape` on anchors, and dozens of `rel` keywords that placed a page in a book or
a series, named its editor or its logo, or served one product's integration. The HTML
Standard keeps a short
[list of link types](https://html.spec.whatwg.org/multipage/links.html#linkTypes) with a
processing model, and browsers do nothing with the rest.

Most of what remains is inert, but three cases deserve care. A `rel` keyword that belongs on
`<a>`, such as `nofollow` or `noopener`, does nothing on `<link>`, so the protection or hint
the author meant is missing. `name` on `<a>` still works as a fragment target in browsers,
so add an `id` before deleting it. And a `<meta name="referrer">` with an unknown token is
ignored, so the page falls back to the default policy and can send more of its URL than
intended.

Deadhead reports sixteen:

- [`meta/referrer-value`](/rules/meta/referrer-value): an unknown referrer token. Harmful.
- [`link/anchor-keywords`](/rules/link/anchor-keywords): `<a>`-only keywords on `<link>`.
- [`link/navigation-keywords`](/rules/link/navigation-keywords),
  [`link/document-info-keywords`](/rules/link/document-info-keywords),
  [`link/vendor-keywords`](/rules/link/vendor-keywords) and
  [`link/copyright`](/rules/link/copyright): keywords with no processing model. Write
  `license` instead of `copyright`.
- [`link/href-missing`](/rules/link/href-missing): a `<link>` that points nowhere.
- [`attr/name-obsolete`](/rules/attr/name-obsolete),
  [`attr/rev-urn`](/rules/attr/rev-urn), [`attr/methods`](/rules/attr/methods),
  [`attr/link-target`](/rules/attr/link-target),
  [`attr/charset-obsolete`](/rules/attr/charset-obsolete),
  [`attr/a-coords-shape`](/rules/attr/a-coords-shape) and
  [`attr/area-hreflang-type-nohref`](/rules/attr/area-hreflang-type-nohref): obsolete link
  attributes.
- [`attr/svg-xlink`](/rules/attr/svg-xlink) and [`element/nextid`](/rules/element/nextid):
  XLink addresses in SVG and an editor hint from the web's first years.

The keyword rules that carry a fix remove only the dead keyword and leave the rest of `rel` as
written; when nothing is left, the element goes.
