---
ruleId: "meta/robots-value"
title: "<meta name=\"robots\"> with an unknown directive"
description: "A robots token no addressed crawler documents does nothing, so a typo voids indexing intent with no warning."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="robots" i], meta[name="googlebot" i], meta[name="googlebot-news" i], meta[name="bingbot" i], meta[name="yandex" i], meta[name="applebot" i]'
match: "logic"
fix: { op: "none" }
replacement: "Spell each token from the lists of the crawlers the tag addresses: <meta name=\"robots\" content=\"noindex, nofollow\">. Delete noodp, noydir and nositelinkssearchbox: no crawler documents them."
tags: ["search"]
impacts: ["seo"]
related: ["meta/http-equiv-robots"]
---

A robots tag speaks to the crawlers its name addresses: `robots` addresses all of them, and
`googlebot`, `googlebot-news`, `bingbot`, `yandex` and `applebot` address one engine each.
Each engine publishes the tokens it reads. Google states that it ignores rules outside its
list; Bing, Yandex and Apple publish their lists without saying what happens to the rest. A
token no addressed crawler documents has no defined effect, so a typo voids the author's
indexing intent with no warning.

## Why avoid

No current specification defines the vocabulary. HTML 4.01 listed four terms in an
informative note, and MDN calls the tag "a de-facto standard". Google, Bing, Yandex and
Apple each document a different set, and Google's page warns that its rules "may not be
treated the same by all other search engines". A token outside every set has no effect any
engine documents: for Google, `no-follow` leaves links followed and `no-index` leaves the
page in the index.

The danger concentrates on exclusion typos: a mistyped `noindex` publishes what the author
meant to hide.

Which list applies depends on the name. Under `robots`, a token is live when any crawler or
tool documents it. `noarchive` is live there: Bing and Yandex honor it, and Bing also reads
it as keeping the page out of Chat and Copilot links and out of training Microsoft's
generative AI models. Bing reads `nocache` as a milder sibling that still lets Chat and
Copilot show the URL, title and snippet. Yandex reads `archive` as the undo of `noarchive`.
Google ignores all three: the cached-page link `noarchive` hid is gone.

`noai` and `noimageai` are live there too. DeviantArt defined them in 2022 to opt pages out
of AI training datasets, and img2dataset skips any image whose `X-Robots-Tag` carries one.
Google's AI control, Google-Extended, is a robots.txt token with no meta form.

Three names are documented by no crawler today:

- `noodp` asked engines not to show Open Directory Project descriptions in place of the
  page's own. By June 2017 the directory had closed, and Google announced the rule as a
  no-op.
- `noydir` asked Yahoo not to show Yahoo Directory descriptions. Yahoo's help now points
  webmasters to Bing's documentation, which does not list it.
- `nositelinkssearchbox` switched off a Google results feature that Google has since removed.

## Use instead

Write documented tokens, comma-separated. `noindex` is the one every source documents, and
`nofollow` every source but Bing's current page:

```html
<meta name="robots" content="noindex, nofollow">
```

To speak to one crawler, use its own name with its own tokens:

```html
<meta name="googlebot" content="nosnippet">
<meta name="bingbot" content="nocache">
```

## Detectability

Detectable with logic refining the selector, which prefilters to the six names above. The
module in `packages/rules/logic/meta/robots-value.ts` folds `content` to lowercase and
splits it on commas first. An item with a colon splits on its first colon into
`name: value`; an item without one splits on whitespace into bare names.

The list a name is checked against depends on the tag:

- `googlebot` and `googlebot-news` take Google's table plus its defaults, `index` and
  `follow`. `noarchive`, `nocache`, `archive`, `noai` and `noimageai` trip there.
- `robots`, `bingbot`, `yandex` and `applebot` take any token some crawler or tool
  documents: Google's table, `index` and `follow`, `noarchive`, `nocache`, `archive`, `noai`
  and `noimageai`. Bing's list omits `nofollow`, so `bingbot` is not held to it.

Parameterized names need a value. `max-snippet` and `max-video-preview` take an integer, and
`max-image-preview` takes `none`, `standard` or `large`. `unavailable_after` needs a
non-empty value; the module does not parse the date. An RFC 822 or RFC 850 date carries a
comma of its own (`Sat, 25 Jun 2010 15:00:00 GMT`), and no token opens with a digit, so an
item that opens with one folds back into the date before it. The list form is
comma-separated, so `noindex max-snippet:50` without the comma is reported: its first colon
yields the name `noindex max-snippet`. The finding points at the tag.

Conflicting pairs are out of scope, because engines disagree on them. Google applies the more
restrictive rule, Yandex lets the allowing one win, and MDN calls the outcome undefined.

## Resources

- [Google Search Central: robots meta tag specifications](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): valid rules, the "historical and other unused rules" Google ignores (`noarchive`, `nocache`, `nositelinkssearchbox`), its two crawler names, comma lists and restrictive-wins conflicts.
- [Google Search Central: meta tags Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags): "For a full list of values that Google supports, see the list of valid rules", and "The default values are index, follow".
- [Google Search Central Blog: Better snippets for your users (June 2017)](https://developers.google.com/search/blog/2017/06/better-snippets-for-your-users): "With DMOZ (ODP) closed, we stopped relying on its data and thus the NOODP rule is already no-op."
- [Bing Webmaster Tools: Robots meta tags and attributes that Bing supports](https://www.bing.com/webmasters/help/robots-meta-tags-and-attributes-that-bing-supports-5198d240): its tokens, with their Chat, Copilot and model-training effects; `bingbot` limits a tag to Bing.
- [DeviantArt: opting out of AI datasets](https://www.deviantart.com/team/journal/UPDATE-All-Deviations-Are-Opted-Out-of-AI-Datasets-934500371): `noai` and `noimageai`, for every site.
- [img2dataset README](https://github.com/rom1504/img2dataset#readme): skips images whose `X-Robots-Tag` carries either, by default.
- [Google: common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers): Google-Extended is a robots.txt token.
- [Yandex Webmaster: robots meta tag and X-Robots-Tag](https://yandex.com/support/webmaster/controlling-robot/meta-robots.html): `noindex`, `nofollow`, `none`, `noarchive`, `index`, `follow`, `archive` and `all`; allowing directives win over prohibiting ones; `yandex` gives a directive to the Yandex robots alone.
- [Apple Support: About Applebot](https://support.apple.com/en-us/119829): `noindex`, `nosnippet`, `nofollow`, `none` and `all`; the `applebot` name addresses Applebot.
- [Yahoo Help: Webmaster tools available for Yahoo Search](https://help.yahoo.com/kb/search-for-desktop/SLN2213.html): "Yahoo Search results come from the Yahoo web crawler (Slurp) and Bing's web crawler", with a pointer to Bing's help.
- [MDN: `<meta name="robots">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/robots): keywords by crawler, undefined conflicts, and "not part of any specification". Its `noarchive` and `nocache` entries predate Google's and Bing's current pages.
- [WHATWG Wiki: MetaExtensions, `robots`](https://wiki.whatwg.org/wiki/MetaExtensions): the registry entry, with `NOODP` blocking Open Directory Project descriptions and `NOYDIR` blocking Yahoo Directory descriptions.
- [W3C HTML 4.01, appendix B.4.1.2: Robots and the META element](https://www.w3.org/TR/html401/appendix/notes.html#h-B.4.1.2): "The list of terms in the content is ALL, INDEX, NOFOLLOW, NOINDEX."
- [The Web Robots Pages: About the Robots `<META>` tag](https://www.robotstxt.org/meta.html): the original four values `INDEX`, `NOINDEX`, `FOLLOW`, `NOFOLLOW`, comma-separated, with `INDEX,FOLLOW` as the default.
