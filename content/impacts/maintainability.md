---
description: "Rules whose cost falls on the people who maintain a page: markup nothing reads, which a reader has to understand before deleting it."
---

Maintainability is the cost a finding puts on people rather than on browsers, visitors or
crawlers. The markup on this page mostly does nothing at all when the page loads. It costs
the next person who opens the template: they have to work out what `X-UA-Compatible`,
`rel="shortcut icon"` or `<html version>` was for before they dare to delete it, and while
it stays, it teaches them it matters.

That is what separates this list from the [full rule index](/rules). The index lists every
rule by where its markup lives. This page lists the ones that carry a maintenance cost, and
for about two thirds of them that is the only cost: no browser, assistive technology or
search engine behaves differently whether the markup is there or not. The rest also appear
under another impact, such as [interoperability](/impacts/interop) for removed features a
page may still depend on, or [security](/impacts/security) for CSP directives that left the
specification. The rules that harm users or search are mostly on those other pages,
not here.

It is also where deadhead's autofix does most of its work. More than half of these rules
carry a fix, because deleting markup that nothing reads changes nothing a visitor can see.
`deadhead --fix dist` removes those findings and reports what is left, and what is left
needs a person: presentational attributes that still style the page, elements whose
fallback content still renders, values the browser still reads.

Three of these rules are harmful. A second `<base>` or a second charset declaration is
ignored by the browser, but it misleads every later edit, because the copy people change is
not the one that applies. A `referrer` directive inside a Content Security Policy sets no
referrer policy at all, while reading as if it did.

The [install page](/install) shows how to run the checks and the fixes on a built site, and
the [10,000 home pages post](/blog/what-10000-home-pages-put-in-their-head) shows how much of
this markup the most visited sites still ship.
