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

A `link rel=canonical` carrying `hreflang`, `lang`, `media` or `type` describes an alternate
version of the page. Google does not use such annotations for canonicalization, so the
consolidation signal stays silent.

The qualifiers belong to `rel="alternate"`. Each one describes how a linked version differs from
the current page: `hreflang` its language, `media` the devices it is for, `type` its format. A
canonical says the opposite: the linked URL is the same content, and the preferred address for
it. The tag can come from merging the two annotations into one, in a language switcher, a
separate mobile site, or a feed link with its `rel` edited.

## Why avoid

Google: "`rel="canonical"` annotations that suggest alternate versions of a page are ignored;
specifically, `rel="canonical"` annotations with `hreflang`, `lang`, `media`, and `type`
attributes are not used for canonicalization." Such a tag suggests an alternate version, which
contradicts the relation.

The WHATWG link semantics agree from the other side. `hreflang` gives the language of the linked
resource and `media` the media it applies to, so the qualifiers describe a different version,
not the same content.

The signal then stays silent while the author believes it speaks. Duplicates of the page, such
as copies with tracking parameters, never consolidate under the address the author chose, and
Google picks a canonical from its other signals. Where the qualified tag replaced the alternate
it was meant to be, the other version also loses its annotation: with no `rel="alternate"` link,
a language version is missing from the hreflang set.

## Use instead

Keep the canonical plain, and declare each alternate with its own `rel="alternate"` link:

```html
<!-- Before: a language alternate written as a canonical -->
<link rel="canonical" hreflang="fr" href="https://example.com/fr/post">

<!-- After: the page's own canonical, and the French version as an alternate -->
<link rel="canonical" href="https://example.com/post">
<link rel="alternate" hreflang="fr" href="https://example.com/fr/post">
```

A separate mobile site follows the same split. Google's example puts a plain canonical to the
desktop URL on both pages, and `rel="alternate" media="only screen and (max-width: 640px)"` on
the desktop page alone, pointing at the mobile URL. A feed or another format keeps its `type` on
an `alternate` link: `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `rel` matches with `~=` because it is a space-separated token
set, and the comma lists one branch per qualifier. A `rel="canonical alternate"` with a
qualifier reports too: Google ignores the canonical half of it.

No autofix. Google skips the tag today; stripping the qualifier makes it count, for whatever URL
it names. A qualified canonical can name the variant (a language or print version) instead of
the preferred page, and a page can carry several. In the top 10,000 crawl of 2026-10-04, one
page would have been left with three conflicting plain canonicals and another with an href
ending in `//`. A person picks the canonical.

## Resources

- [Google Search Central: consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): canonical annotations with `hreflang`, `lang`, `media` and `type` are not used for canonicalization; use the appropriate alternate annotations instead.
- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): `hreflang` gives the language of the linked resource and `media` gives its applicable media.
- [Google Search Central: localized versions of your pages](https://developers.google.com/search/docs/specialty/international/localized-versions): `link rel="alternate" hreflang` as the vehicle for language variants.
- [Google Search Central: mobile-first indexing best practices](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing): for separate mobile URLs, "The desktop URL is always the canonical", with a `media` alternate on the desktop page.
