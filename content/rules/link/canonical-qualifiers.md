---
ruleId: "link/canonical-qualifiers"
title: "<link rel=\"canonical\"> with alternate-version qualifiers"
description: "A canonical carrying hreflang, lang, media or type describes an alternate version, so Google skips it."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="canonical" i][hreflang], link[rel~="canonical" i][lang], link[rel~="canonical" i][media], link[rel~="canonical" i][type]'
fix: { op: "none" }
replacement: "Strip the qualifier and keep a plain canonical: <link rel=\"canonical\" href=\"https://example.com/post\">. For a genuine alternate version use <link rel=\"alternate\" hreflang=\"fr\" href=\"https://example.com/fr/post\">."
tags: ["search"]
impacts: ["seo"]
related: ["link/canonical-relative", "link/canonical-http"]
---

A `link rel=canonical` carrying `hreflang`, `lang`, `media` or `type` describes an alternate version of the page. Google does not use such annotations for canonicalization, so the consolidation signal stays silent.

## Why avoid

Google does not use canonical annotations carrying `hreflang`, `lang`, `media` or `type` for canonicalization. Such a tag suggests an alternate version, which contradicts the relation: a canonical names the preferred address of the same content.

The WHATWG link semantics agree from the other side. `hreflang` gives the language of the linked resource and `media` gives its applicable media, so the qualifiers describe a different version rather than the same content.

The signal then stays silent while the author believes it speaks. Duplicates never consolidate, and the preferred address gathers no ranking signals.

## Use instead

Keep the canonical plain, and declare alternates with a separate annotation:

```html
<link rel="canonical" href="https://example.com/post">
<link rel="alternate" hreflang="fr" href="https://example.com/fr/post">
```

## Detectability

Detectable with the selector alone. `rel` matches with `~=` because it is a space-separated token set, and the comma lists one branch per qualifier.

No autofix. Google skips the tag today; stripping the qualifier makes it count, for whatever URL it names. A qualified canonical often names the variant (a language or print version) rather than the preferred page, and a page can carry several. In the top 10,000 crawl of 2026-10-04, one page would have been left with three conflicting plain canonicals and another with an href ending in `//`. A person picks the canonical.

## Resources

- [Google Search Central: consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): canonical annotations with `hreflang`, `lang`, `media` and `type` are not used for canonicalization; use the appropriate alternate annotations instead.
- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): `hreflang` gives the language of the linked resource and `media` gives its applicable media.
- [Google Search Central: localized versions of your pages](https://developers.google.com/search/docs/specialty/international/localized-versions): `link rel="alternate" hreflang` as the vehicle for language variants.
