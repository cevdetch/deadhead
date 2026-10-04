---
title: "What 10,000 home pages put in their head"
description: "Deadhead 0.2.1 on the Tranco top 10,000 home pages, as served and after scripts ran: what the most visited sites ship, with the data behind every number."
pubDate: "2026-10-05"
draft: false
results: "2026-10-04-top10000.json"
---

We fetched the home page of every site in the Tranco top {{count list.n}} that allowed it,
once as the server sent it and once after its scripts ran in a browser, and linted both with
deadhead 0.2.1. {{count coverage.raw.linted}} home pages could be linted as served.

Almost all of them, {{pct severity.any.rate}}, ship markup deadhead reports. Most of that is
dead weight. But {{pct severity.harmful.rate}} of the pages (95% interval
{{pct severity.harmful.ci.0}} to {{pct severity.harmful.ci.1}}) ship at least one harmful
finding: markup that breaks something for the people using the page.

Every number on this page is read from the published data file when the page is built, and
every rule name links to a page with the sources behind it.

## At a glance

- **The most common finding is a default written out.**
  [`type="text/javascript"`](/rules/attr/script-type-javascript) is on
  {{rate attr/script-type-javascript}} of home pages.
- **The most common harmful finding locks zoom.** {{rate meta/viewport-user-scalable}} of
  pages [stop people zooming in](/rules/meta/viewport-user-scalable) to read.
- **Scripts write their own markup.** After scripts run, [`<style type>`](/rules/attr/style-type)
  goes from {{rate attr/style-type}} of pages to {{rate attr/style-type rendered}}.
- **Platforms spread their defaults.** A platform's template lands on every site that runs it;
  the [platform table](#platforms) shows which rule each one carries most.
- **The bytes are small.** Applying every deadhead fix saves a median of
  {{bytes bytes.saved.brotli.median}} per page after compression. The case for cleaning up is
  correctness, not weight.

## The most common findings

{{chart rules 15}}

The top five, and why each is reported:

- [`attr/script-type-javascript`](/rules/attr/script-type-javascript),
  {{rate attr/script-type-javascript}}: `type="text/javascript"` restates what a script
  without a type already is. The HTML Standard tells authors to leave it out.
- [`meta/twitter-card-names`](/rules/meta/twitter-card-names),
  {{rate meta/twitter-card-names}}: `twitter:title`, `twitter:description` and
  `twitter:image` that repeat the Open Graph tags beside them. Two copies of one title drift
  apart.
- [`link/shortcut-icon`](/rules/link/shortcut-icon), {{rate link/shortcut-icon}}: the
  `shortcut` in `rel="shortcut icon"`. It is no link relation; HTML defines `icon`, which
  does the job alone.
- [`meta/http-equiv-x-ua-compatible`](/rules/meta/http-equiv-x-ua-compatible),
  {{rate meta/http-equiv-x-ua-compatible}}: a switch for Internet Explorer's document modes,
  which no supported browser has.
- [`meta/keywords`](/rules/meta/keywords), {{rate meta/keywords}}: a topic list no major
  search engine ranks on.

The median page carries {{count perPage.rules.median}} different findings,
{{count perPage.findings.median}} in all.

## The findings that hurt people

Harmful findings are rarer and matter more:

- [`meta/viewport-user-scalable`](/rules/meta/viewport-user-scalable),
  {{rate meta/viewport-user-scalable}}: `user-scalable=no` or a low `maximum-scale` stops
  people zooming in to read, which fails WCAG 1.4.4.
- [`document/html-lang`](/rules/document/html-lang), {{rate document/html-lang}}: no page
  language, so a screen reader guesses how to pronounce the text.
- [`meta/og-relative-url`](/rules/meta/og-relative-url), {{rate meta/og-relative-url}}: a
  relative Open Graph URL that preview crawlers cannot resolve, so shared links lose their
  image.
- [`head/viewport-missing`](/rules/head/viewport-missing),
  {{rate head/viewport-missing}}: no viewport, so phones lay the page out at desktop width
  and shrink it.
- [`document/doctype`](/rules/document/doctype), {{rate document/doctype}}: a missing or
  legacy doctype, which puts the page in quirks or limited quirks mode.

One harmful rule needs a footnote. [`head/charset-position`](/rules/head/charset-position)
reports a `<meta charset>` past the first 1,024 bytes on {{rate head/charset-position}} of
pages. A late declaration matters only when the server names no encoding, and
{{share rules.head/charset-position.raw.charsetHeader rules.head/charset-position.raw.sites}}
of these pages name one in the `Content-Type` header, which takes precedence.

## What scripts add

{{chart rendered 12}}

Some markup exists only after scripts run. Of the rendered pages that carry an
[`origin-trial` token](/rules/meta/http-equiv-origin-trial),
{{rate meta/http-equiv-origin-trial injected}} got it from a script. For
[`charset` on scripts and links](/rules/attr/charset-obsolete) the share is
{{rate attr/charset-obsolete injected}}, and for [`<style type>`](/rules/attr/style-type)
{{rate attr/style-type injected}}. These come from third-party tags. A linter that reads only
the served HTML misses them, and one that reads only the DOM reports markup the site did not
write. Deadhead's CLI reads the first; its bookmarklet reads the second.

## Platforms

{{table platforms}}

A platform's defaults travel to every site that runs it. The last column names the rule each
platform carries most, measured against its rate on every site; the multiplier says how many
times more. Platforms with fewer than 30 linted sites are left out. Fixing one default fixes
it everywhere the platform runs.

## Big sites and the rest

The most visited thousand differ from the next nine thousand.
[`meta/twitter-card-names`](/rules/meta/twitter-card-names) is at
{{rate meta/twitter-card-names top1k}} in ranks 1 to 1,000 and
{{rate meta/twitter-card-names rest}} below. Zoom locking runs the other way:
[`meta/viewport-user-scalable`](/rules/meta/viewport-user-scalable) is at
{{rate meta/viewport-user-scalable top1k}} at the top and
{{rate meta/viewport-user-scalable rest}} below.

## Bytes, honestly

The median home page is {{bytes bytes.page.raw.median}} of HTML,
{{bytes bytes.page.brotli.median}} after brotli. Applying every deadhead fix saves a median of
{{bytes bytes.saved.raw.median}}, or {{bytes bytes.saved.brotli.median}} after brotli. That is
small, and it is meant to be: the fixes delete dead markup, not content. The largest single
source is [`meta/twitter-card-names`](/rules/meta/twitter-card-names), with
{{bytes bytes.rules.meta/twitter-card-names.median}} at the median on
{{count bytes.rules.meta/twitter-card-names.sites}} sites.

## What to do

| Finding | Do this | Rules |
|---|---|---|
| Defaults written out | Delete them. `deadhead --fix` removes them. | [`attr/script-type-javascript`](/rules/attr/script-type-javascript), [`attr/style-type`](/rules/attr/style-type), [`link/shortcut-icon`](/rules/link/shortcut-icon) |
| Copies of Open Graph | Keep `twitter:card` and the account tags; delete the copies. | [`meta/twitter-card-names`](/rules/meta/twitter-card-names) |
| Tags nothing reads any more | Delete them. | [`meta/http-equiv-x-ua-compatible`](/rules/meta/http-equiv-x-ua-compatible), [`meta/msapplication-names`](/rules/meta/msapplication-names), [`meta/keywords`](/rules/meta/keywords) |
| Zoom locked | Drop `user-scalable=no` and any `maximum-scale` below 2. | [`meta/viewport-user-scalable`](/rules/meta/viewport-user-scalable) |
| Missing basics | Add `<!doctype html>`, `lang` on `<html>` and a viewport. | [`document/doctype`](/rules/document/doctype), [`document/html-lang`](/rules/document/html-lang), [`head/viewport-missing`](/rules/head/viewport-missing) |
| Late encoding | Put `<meta charset="utf-8">` first in `<head>`, or name the charset in the header. | [`head/charset-position`](/rules/head/charset-position) |

## The 25 most common rules

{{table rules 25}}

## How we measured

- **The list.** Tranco list Y83KG, created 3 October 2026, top {{count list.n}} domains.
- **Politeness.** One robots.txt request, one page request and one browser visit per site,
  with a user agent that names this project. {{count coverage.raw.skipped}} sites that
  disallow the root in robots.txt were skipped.
- **Who let us in.** {{count coverage.raw.linted}} domains served a home page deadhead could
  lint. {{count coverage.raw.blocked}} answered with a challenge or block page,
  {{count coverage.raw.no-site}} have no website at the bare domain (CDN, API and tracking
  hosts rank high on traffic lists), and {{count coverage.raw.failed}} failed with an error
  or a timeout. Headless Chromium, a real browser, rendered
  {{count coverage.rendered.linted}} home pages. No challenge was solved on a person's behalf.
- **Raw and rendered.** Raw is the HTML as served, which the CLI and the ESLint plugin lint.
  Rendered is the DOM after scripts run, which the bookmarklet sees. Headline numbers are raw.
- **One site, one count.** {{count coverage.raw.duplicate}} domains that redirect to an address
  a higher-ranked domain already reached count once, at the better rank.
- **Intervals.** Every rate carries a Wilson 95% interval.
- **No names.** The data holds aggregates only. No site is named here or in the file.

## Limits

- **Desktop pages.** We fetched as desktop Chrome. A site that sends phones a separate page
  was measured on its desktop page.
- **Mirrors.** Duplicates are matched by final address, so a few mirror networks that serve
  one page from many addresses count once per address.
- **Home pages only.** One page per site says nothing about the rest of the site.

## Data and code

- The data: [2026-10-04-top10000.json](/data/2026-10-04-top10000.json), the aggregate behind
  every number above.
- The method, in full: the corpus
  [README](https://github.com/cevdetta/deadhead/blob/main/corpus/README.md).
- Run deadhead on your own site: the CLI on your built HTML, the ESLint plugin in your editor,
  or the bookmarklet on a live page. See [Install](/install).
