---
description: "The head declarations a page gets one of, base, canonical, charset, description, manifest, title and main, and what a second copy does."
---

Some declarations describe the whole document, so a page has one of each: one `<title>`, one
character encoding, one `<base>`, one canonical URL, one description, one manifest and one
visible `<main>`. Duplicates usually come from layouts that stack, a framework head next to a
plugin's head, or a template and a page that both add the tag, and they rarely show in the
browser.

What a second copy does differs, and none of it is what the author meant. For `<base>`,
charset and manifest, browsers take the first and ignore the rest, so a later one that
disagrees misleads whoever edits it. Google [ignores every canonical](https://developers.google.com/search/blog/2013/04/5-common-mistakes-with-relcanonical)
on a page that declares more than one, and it merges two descriptions into one snippet text
no tag says. Two titles, or none, leave tabs, search results and screen readers without one
name for the page. Two visible `<main>` elements break landmark navigation, because people
who jump to the main content get whichever comes first.

Deadhead reports each:

- [`head/title`](/rules/head/title): zero, duplicate or empty `<title>`. Harmful.
- [`head/canonical-multiple`](/rules/head/canonical-multiple),
  [`head/charset-multiple`](/rules/head/charset-multiple),
  [`head/base-multiple`](/rules/head/base-multiple) and
  [`document/main-multiple`](/rules/document/main-multiple): harmful duplicates.
- [`head/base-position`](/rules/head/base-position): a `<base>` after elements whose URLs
  resolve before it applies.
- [`head/description-multiple`](/rules/head/description-multiple) and
  [`head/manifest-multiple`](/rules/head/manifest-multiple): unnecessary extras. The fix
  deletes extra manifest links; which description to keep is the author's choice.

Only the extra manifests are autofixed. For the rest, which copy is right is a decision the
markup cannot make.
