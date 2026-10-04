---
title: "What 10,000 home pages put in their head"
description: "Deadhead 0.2.1 on the Tranco top 10,000 home pages, as served and after scripts ran: what the most visited sites ship, with the data behind every number."
pubDate: "2026-10-05"
draft: true
results: "2026-10-04-top10000.json"
---

On 4 October 2026 we fetched the home page of every site in the Tranco top {{count list.n}}
that allowed it, once as the server sent it and once after its scripts ran in headless
Chromium, and linted both with deadhead 0.2.1. {{count coverage.raw.linted}} home pages could
be linted as served. Of those, {{pct severity.any.rate}} ship at least one thing deadhead
reports, and {{pct severity.harmful.rate}} (95% interval {{pct severity.harmful.ci.0}} to
{{pct severity.harmful.ci.1}}) ship at least one harmful finding: markup that breaks
something for the people using the page.

Every number on this page is read from the published data file at build time, and every
rule name links to a page with the sources behind it.

## How we measured

- **The list.** Tranco list Y83KG, created 3 October 2026, top {{count list.n}} domains.
- **Politeness.** One robots.txt request, one page request and one Chromium visit per site,
  with a user agent that names this project. robots.txt was honoured:
  {{count coverage.raw.skipped}} sites that disallow the root were skipped.
- **Raw and rendered.** The raw HTML is what the CLI and the ESLint plugin lint; the
  rendered DOM is what the bookmarklet sees after scripts run. Headline numbers are raw.
- **One site, one count.** {{count coverage.raw.duplicate}} domains that redirect to an
  address a higher-ranked domain already reached count once, at the better rank.
- **Intervals.** Every rate carries a Wilson 95% interval.
- **No names.** The data holds aggregates only. No site is named here or in the file.

## Who let us in

Of the {{count list.n}} domains, {{count coverage.raw.linted}} served a home page deadhead
could lint. {{count coverage.raw.blocked}} answered with a challenge or block page,
{{count coverage.raw.no-site}} have no website at the bare domain (CDN, API and tracking
hosts rank high on traffic lists), and {{count coverage.raw.failed}} failed with an error
or a timeout. Headless Chromium, a real browser, got further: {{count coverage.rendered.linted}}
rendered home pages. We solved no challenge on a human's behalf, so the walls are a result
in themselves.

## The most common findings

{{chart rules 15}}

- [`attr/script-type-javascript`](/rules/attr/script-type-javascript),
  {{rate attr/script-type-javascript}}: `type="text/javascript"` restates what a script
  without a type already is.
- [`meta/twitter-card-names`](/rules/meta/twitter-card-names),
  {{rate meta/twitter-card-names}}: `twitter:title`, `twitter:description` and
  `twitter:image` that repeat the Open Graph tags next to them.
- [`link/shortcut-icon`](/rules/link/shortcut-icon), {{rate link/shortcut-icon}}: the
  `shortcut` keyword, an Internet Explorer spelling of `icon`.
- [`meta/http-equiv-x-ua-compatible`](/rules/meta/http-equiv-x-ua-compatible),
  {{rate meta/http-equiv-x-ua-compatible}}: a switch for Internet Explorer document modes,
  which no supported browser has.
- [`meta/keywords`](/rules/meta/keywords), {{rate meta/keywords}}: a tag the major search
  engines stopped reading long ago.

A median page carries {{count perPage.rules.median}} different findings, and
{{count perPage.findings.median}} in all.

## What harms people

The harmful findings are fewer and matter more:

- [`meta/viewport-user-scalable`](/rules/meta/viewport-user-scalable),
  {{rate meta/viewport-user-scalable}}: a viewport that stops people zooming in to read,
  which fails WCAG 1.4.4.
- [`document/html-lang`](/rules/document/html-lang), {{rate document/html-lang}}: no page
  language, so a screen reader guesses how to pronounce the text.
- [`meta/og-relative-url`](/rules/meta/og-relative-url), {{rate meta/og-relative-url}}: a
  relative preview URL that crawlers cannot resolve, so shared links lose their image.
- [`head/viewport-missing`](/rules/head/viewport-missing),
  {{rate head/viewport-missing}}: no viewport at all, so phones lay the page out at desktop
  width.
- [`document/doctype`](/rules/document/doctype), {{rate document/doctype}}: a missing or
  legacy doctype, which puts the page in quirks or limited quirks mode.

[`head/charset-position`](/rules/head/charset-position), {{rate head/charset-position}},
needs a footnote. A charset declaration past the first 1,024 bytes matters only on a page
whose server sends no charset, and most of these pages send `charset=utf-8` in the
`Content-Type` header, which takes precedence.

## What scripts add

{{chart rendered 12}}

Some findings exist only after scripts run. For
[`meta/http-equiv-origin-trial`](/rules/meta/http-equiv-origin-trial),
{{rate meta/http-equiv-origin-trial injected}} of the rendered pages that carry it got it
from a script; for [`attr/charset-obsolete`](/rules/attr/charset-obsolete),
{{rate attr/charset-obsolete injected}}; for [`attr/style-type`](/rules/attr/style-type),
{{rate attr/style-type injected}}. These come from third-party tags. Lint the served HTML
and they are invisible; lint the DOM and you lint markup the site did not write.

## Platforms

{{table platforms}}

A platform's defaults travel to every site that runs it. The last column is the rule each
platform carries most, relative to everyone else, and the multiplier says by how much.
Fixing a default fixes it on every site at once.

## The top 1,000 against the rest

The most visited thousand differ from the next nine thousand.
[`meta/twitter-card-names`](/rules/meta/twitter-card-names) is at
{{rate meta/twitter-card-names top1k}} in ranks 1 to 1,000 and
{{rate meta/twitter-card-names rest}} below. Zoom blocking goes the other way:
[`meta/viewport-user-scalable`](/rules/meta/viewport-user-scalable) is at
{{rate meta/viewport-user-scalable top1k}} at the top and
{{rate meta/viewport-user-scalable rest}} below.

## Bytes, honestly

The median home page is {{bytes bytes.page.raw.median}} of HTML,
{{bytes bytes.page.brotli.median}} after brotli. Applying every deadhead autofix saves a
median of {{bytes bytes.saved.raw.median}}, or {{bytes bytes.saved.brotli.median}} after
brotli. That is small. The case for deleting dead markup is correctness, and the next person
who reads the head, not page weight. The largest single source is
[`meta/twitter-card-names`](/rules/meta/twitter-card-names):
{{bytes bytes.rules.meta/twitter-card-names.median}} at the median, on
{{count bytes.rules.meta/twitter-card-names.sites}} sites.

## The 25 most common rules

{{table rules 25}}

## Run it on your own site

Lint your built HTML with the CLI, add the ESLint plugin to your editor, or run the
bookmarklet on a live page: [Install](/install). Each finding links to the rule page behind
it, with its sources.

## Data and limits

The data file is the aggregate above, with no site names:
[2026-10-04-top10000.json](/data/2026-10-04-top10000.json). The full method is in the
corpus [README](https://github.com/cevdetta/deadhead/blob/main/corpus/README.md).

- **Desktop pages.** We fetched as desktop Chrome. A site that sends phones a separate page
  was measured on its desktop page.
- **Mirrors.** Duplicates are matched by final address, so a few mirror networks that serve
  one page from many addresses count once per address.
- **Home pages only.** One page per site says nothing about the rest of the site.
