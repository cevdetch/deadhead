---
title: "What browsers and chat apps do with broken metadata"
description: "We built 121 pages of conflicting, missing and malformed head metadata and opened them in four browsers and five chat apps. Here is what each showed."
pubDate: "2026-11-12"
draft: true
---

A linter can say a tag is wrong. It cannot say what a reader sees because of it. To find out,
we built [Astro Metadata Lab](https://astro-metadata-lab.cevdet.ch/): 121 small pages, each
with one deliberate change to its head. Some carry a title in three different places. Some
have a relative image URL, a canonical that points at another site, or a favicon declared in an
unusual order. Then we opened them in real browsers and shared them in real chat apps, and
wrote down what appeared.

The results are a set of observations, not a specification. They come from one person's
devices in late October 2026, and caches, accounts and app versions shape what a client shows.
Where a result surprised us, we say how far it goes. The fixtures, every recorded result and
the open gaps are in the [lab repository](https://github.com/cevdetch/astro-metadata-lab).

## The lab

Each case is one HTML page built from a shared template, with one thing changed. The pages use
markers so a result can be read at a glance. In the precedence group, the `<title>` and meta
description say `A`, the Open Graph tags say `B` and carry a red image, the Twitter card tags
say `C` and carry a green image, and the body text says `D`. A preview showing "B" with a red
image used Open Graph. The favicon cases use differently coloured icons in the same way: a blue
circle is the SVG, a red square the ICO.

The 121 cases fall into ten groups: metadata, precedence, canonical URLs, icons, head parsing,
theming, manifests, JSON-LD, language, and indexing and HTTP responses. Many are negative
controls, markup that is wrong on purpose. The lab is research for
[Astro Minimal Template](https://astro-minimal-template.cevdet.ch/): its head follows what the
lab showed.

## How we tested

Browsers: Brave Origin 1.97 (Chromium 155) and Firefox 160 Nightly on Arch Linux, and
Vanadium 156 and Tor Browser 16 alpha on Android 17. Each ran in a private window with the system set to
dark mode. Chat apps: WhatsApp 2.26, Molly 8.19 (a Signal fork), and Discord and Instagram
on the web. LinkedIn's post composer could not display a preview for any lab URL, so its results come from LinkedIn Post Inspector, which is LinkedIn's own preview
debugger rather than a message. X and Facebook Messenger were not available and are untested.

The pages were served from Cloudflare Pages. One deployment detail matters below: the lab's
canonical, `og:url` and image URLs named a deployment-specific host, while we shared the
stable one.

## Open Graph wins

With all four sources present, every client that showed a card used Open Graph: title B,
description B, red image. WhatsApp, Molly, Discord and Instagram agreed, and LinkedIn showed
the same title and image with no description, as it did in every test. With only `<title>` and
a meta description, every client used the title, all but LinkedIn the description, and none
showed an image.

Twitter card tags split the clients. On a page with Twitter tags and no Open Graph, WhatsApp
and Discord used the Twitter title, description and green image. Molly, Instagram and LinkedIn
ignored them and fell back to the `<title>`, with no image. Moving the whole Twitter block
before Open Graph changed one client: Discord then showed the Twitter title and description,
but kept the Open Graph image.

So a page whose `twitter:title` says one thing and `og:title` another can show two different
titles for the same link. That is the case
[`meta/twitter-card-names`](/rules/meta/twitter-card-names) makes for deleting Twitter tags
that repeat Open Graph: when the copies match, nothing changes; when they drift, readers see
the drift.

## Fallbacks when a tag is missing

Removing one Open Graph tag at a time, with no Twitter tags to compete:

- **No `og:title`.** WhatsApp, Molly and LinkedIn used the `<title>`. Discord showed no title,
  and no description either.
- **No `og:description`.** WhatsApp and Molly used the meta description. Discord showed none.
  LinkedIn showed no description in any test, with or without the tag.
- **No `og:image`.** No client showed an image. None took one from the page.

The fallbacks are not reliable enough to lean on. A page with Open Graph tags should carry
all three of title, description and image, and
[`meta/og-required-properties`](/rules/meta/og-required-properties) reports a page with Open
Graph and no `og:image`. Leaving out `og:type`, `og:url` or the image dimension tags made no
visible difference in Molly, Instagram, WhatsApp, Discord or LinkedIn.

## Card layout

Molly, Instagram and LinkedIn showed every image as a large card, whatever `twitter:card`
said. Discord did not: it showed a large image only with
`<meta name="twitter:card" content="summary_large_image">`, and a small summary layout with
`summary` or with no `twitter:card` at all. That is why
[`meta/twitter-card-names`](/rules/meta/twitter-card-names) never reports `twitter:card`: the
layout tag still does a job.

## Images

A root-relative `og:image`, such as `/cases/assets/social-red.png`, showed in LinkedIn, Molly,
Discord and Instagram. WhatsApp showed no image. Open Graph defines its URLs as absolute, and one of five clients dropped the image, so
[`meta/og-relative-url`](/rules/meta/og-relative-url) stays harmful: the failure is real, and
the author never sees it in a browser.

An SVG `og:image` showed only in Instagram. A missing image, one that returns 404, gave
Discord and Instagram a broken-image placeholder and the others no image. A 1200 × 630 PNG
worked everywhere.

## Canonicals, noindex, redirects and 404s

Link previews ignored the canonical. A missing canonical, a relative one (`href="./"`) and one
pointing at an unreachable origin all produced normal cards. LinkedIn displayed the
deployment-specific host that the canonical and `og:url` named; Molly and WhatsApp displayed
the host we shared; Discord and Instagram displayed no domain.

That cuts both ways. A broken canonical does not break a preview, so nobody notices it there.
Search engines are where it matters, and that is what
[`link/canonical-relative`](/rules/link/canonical-relative),
[`head/canonical-multiple`](/rules/head/canonical-multiple) and
[`link/canonical-http`](/rules/link/canonical-http) are for.

`noindex` did not stop a preview: both noindex pages produced cards in every client. A 302
redirect gave the card of the page it pointed to. A real 404 produced no card, except in
Instagram, which showed a card with a title and description.

## What the parser does to the head

Some cases test the HTML parser rather than a client's preferences.

- **An element that does not belong in the head.** One page puts a `<div>` before its
  metadata. In Firefox and Brave the title, description, canonical and `og:title` all ended up
  in `<body>`. `document.title` still worked, so the page looked fine. Google stops reading the
  head at such an element, which is what
  [`head/metadata-position`](/rules/head/metadata-position) reports.
- **Metadata inside `<noscript>`.** With scripting on, Firefox parsed the contents as text, as
  the HTML parser does, and the tab showed the URL instead of the title. With scripting off,
  the same tags became head elements. One page gives different metadata to different readers.
- **JSON-LD with a literal `</script>`.** In Firefox the string ended the script block early,
  the JSON failed to parse, and the markup after it ran as HTML: an injected image was requested
  and its `onerror` handler ran. Escaping `<` as `\u003c` kept the same data parseable and
  inert.
  [`script/json-ld-unescaped-lt`](/rules/script/json-ld-unescaped-lt) reports the unescaped
  form.
- **A late charset.** Pages with `<meta charset>` past the first 1,024 bytes rendered normally in
  all four browsers, because the server's `Content-Type` named UTF-8 and the header takes
  precedence. The lab does not yet isolate a late declaration without that header, which is when
  [`head/charset-position`](/rules/head/charset-position) matters.
- **No viewport.** On Vanadium, the page without a viewport meta was laid out at desktop width
  with small text, as [`head/viewport-missing`](/rules/head/viewport-missing) describes.

## Favicons

Twenty cases vary how the icons are declared. In Brave, Firefox and Vanadium:

- An SVG alone, or an ICO alone, worked in all three. With no icon declared at all, all
  three showed the site's root `/favicon.ico` anyway.
- With an ICO marked `sizes="32x32"` and an SVG, in either order, Brave and Firefox showed the
  SVG and Vanadium the ICO. Adding `sizes="any"` to the SVG made Vanadium show the SVG too.
- With neither carrying `sizes`, the order mattered for the Chromium browsers: SVG first, then
  ICO, gave Brave and Vanadium the ICO. Firefox showed the SVG in both orders.
- When the SVG returned 404, Brave and Vanadium fell back to the ICO. Firefox showed no icon.
- Given two equally sized PNGs, all three showed the one declared last, in both orders.

Tor Browser on Android gave results we cannot read yet: on some pages it showed icons the page
never declared, which points at icon caching. We leave it out until a rerun in a fresh profile.

None of this is a lint finding: every declaration in these cases is valid HTML. It does show
that "which icon will a browser pick" has no single answer, and that a site keeps its icon
predictable by making every declared file the same mark. The recommendations behind
[`link/shortcut-icon`](/rules/link/shortcut-icon) and the other [icon rules](/topics/icons) are
about removing declarations, and fewer declarations leave fewer choices to differ on.

## Colour schemes

In dark mode, Brave, Firefox and Vanadium showed a page with no `color-scheme` in light browser
defaults. `<meta name="color-scheme" content="light dark">` alone made the page, its form
controls and its system colours dark; repeating the declaration in CSS changed nothing visible.
A page that hardcodes a white background got native controls that did not match it. In light
mode, Firefox and Vanadium showed `light dark` and `dark light` the same way, light: the order
of the keywords does not pick the scheme, the reader's preference does. Tor Browser stayed light
in dark mode, which matches its fingerprinting protection reporting a light preference, though
we did not measure that.

A `theme-color` pair behind `media` queries changed no visible browser interface in our four
browsers and no card accent in Signal, WhatsApp, Discord or Instagram. We did not test Safari
or installed web apps. A malformed value is what
[`meta/theme-color-value`](/rules/meta/theme-color-value) and
[`meta/color-scheme-value`](/rules/meta/color-scheme-value) report.

## What to take from it

- Describe a page once, in Open Graph, with an absolute `og:image` PNG, and keep
  `twitter:card`. Delete Twitter tags that repeat Open Graph.
- Keep `<title>` and the meta description accurate too. Every client used the title on a page
  without Open Graph, and three of five ignored Twitter tags in its favour.
- Do not expect a preview to reveal a broken canonical, a `noindex` or a misplaced head element.
  They show up in search, weeks later. That is what a linter is for.
- Escape `<` in JSON-LD, keep metadata out of `<noscript>`, and keep non-head elements out of
  the head.

## Limits

Every result here is one observation on one device. We did not test X or Facebook Messenger,
installation and home-screen icons, screen readers, or a late charset without an HTTP header.
The Tor icon results need a rerun. The lab's per-case
[result pages](https://astro-metadata-lab.cevdet.ch/cases/results/) list what is recorded and what is not, and anyone can open the cases in another client.
