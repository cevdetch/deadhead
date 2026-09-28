---
ruleId: "script/json-ld-howto-faq-announcement"
title: "<script> or microdata HowTo, FAQPage, SpecialAnnouncement"
description: "This JSON-LD wins no Google rich result; delete it unless another search host reads it."
pubDate: "2026-09-23"
status: "situational"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "any"
selector: 'script[type="application/ld+json" i], [itemtype$="schema.org/HowTo" i], [itemtype$="schema.org/FAQPage" i], [itemtype$="schema.org/SpecialAnnouncement" i]'
match: "logic"
fix: { op: "none" }
replacement: "Delete the markup when Google Search was its sole reason, and keep the visible FAQ or how-to content on the page."
tags: ["search", "structured-data"]
impacts: ["seo", "maintainability"]
related: ["script/json-ld-search-action", "script/json-ld-syntax", "attr/data-vocabulary"]
---

`HowTo`, `FAQPage` and `SpecialAnnouncement` structured data once earned expandable
steps, question lists and COVID-era banners in Google results. Google retired all three
displays between 2023 and 2026. The types are still valid schema.org, so whether the
markup stays depends on who else reads it.

## Why avoid

Google retired the displays one by one. How-to went first: "As of September 13, Google
Search no longer shows How-to rich results on desktop, which means this result type is
now deprecated", after mobile in August 2023. Special announcements went in the June 2025
simplification, and their documentation came down on 2025-09-09 because "these structured
data types are no longer shown in Google Search results". FAQ went last: the changelog
entry of 2026-05-08 says the feature "will no longer appear in Google Search starting May
7, 2026".

The markup outlived the features. The 2024 Web Almanac finds `FAQPage` growing after the
2023 cut, "rising from 0.2% in 2022 to 0.6% in 2024" on desktop. Google's advice is that
there is "no need to proactively remove it", since unused markup "does not cause problems
for Search, but also has no visible effects in Google Search". The cost is the bytes, and
the upkeep of a block that must match the visible content for a display that no longer
exists.

The status is `situational` for one reason: Google says the use of these types "outside
of Google Search (and dependent features) is not affected". A page that feeds another
consumer keeps its markup; a page that wrote it for Google's rich results can drop it.

## Use instead

Keep the content on the page, and drop the copy made for Google:

```html
<section>
  <h2>Frequently asked questions</h2>
  <details>
    <summary>Do you ship abroad?</summary>
    <p>Yes, to the EU and the UK.</p>
  </details>
</section>
```

## Detectability

Detectable with a selector plus logic. The selector pre-filters JSON-LD scripts and three
Microdata item types. The logic in
`packages/rules/logic/script/json-ld-howto-faq-announcement.ts` parses a JSON-LD block and
walks every object and array, `@graph` included, for a node whose `@type` is, or lists,
`HowTo`, `FAQPage` or `SpecialAnnouncement`: bare, `schema:`-prefixed, or the full
schema.org IRI. A block that fails `JSON.parse` is `script/json-ld-syntax`'s finding. The
CLI, the bookmarklet and the ESLint plugin all report; none skips.

Type names match whole. `HowToStep` and `HowToSection` live on inside `Recipe`, and the
Microdata branches end-anchor with `$=` for the same reason. Types Google retired from
Search that still feed another Google product, such as `ClaimReview`, `Dataset` and
`Book`, stay out.

There is no autofix. Deleting data another consumer reads is the author's call, and
removing one node from a JSON-LD block is an edit no fix op expresses.

## Resources

- [Google Search Central Blog: Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes): John Mueller, 2023-08-08, updated 2023-09-14; How-to "is now deprecated", and "no need to proactively remove" unused markup.
- [Google Search Central Blog: Simplifying the search results page](https://developers.google.com/search/blog/2025/06/simplifying-search-results): 2025-06-12; Special Announcement phased out, and use "outside of Google Search (and dependent features) is not affected".
- [Google Search Central: Latest documentation updates](https://developers.google.com/search/updates): 2025-09-09 for special announcements, 2026-05-08 for FAQ, "starting May 7, 2026".
- [Web Almanac 2024: Structured data](https://almanac.httparchive.org/en/2024/structured-data): `FAQPage` "rising from 0.2% in 2022 to 0.6% in 2024" on desktop.
