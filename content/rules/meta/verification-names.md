---
ruleId: "meta/verification-names"
title: "<meta name> verification names"
description: "Ownership tokens for services that closed or renamed their tag; nothing checks them, but verify-v1 may still hold a Google verification."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "community"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="verify-v1" i], meta[name="y_key" i], meta[name="pagekey" i], meta[name="microid" i], meta[name="readability-verification" i], meta[name="norton-safeweb" i], meta[name="blogcatalog" i], meta[name="alexaVerifyID" i]'
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete it; verify the site in the search engine's console instead. For verify-v1, confirm in Search Console that google-site-verification holds the property first."
tags: ["search"]
impacts: ["seo", "maintainability"]
related: ["meta/page-info-names", "meta/keywords"]
---

Eight `meta` names claim, or look like they claim, ownership of a page for some service. Five were documented as ownership checks: `verify-v1` for Google, `y_key` for Yahoo! Site Explorer, `blogcatalog` for BlogCatalog, `alexaVerifyID` for Alexa and `microid` for MicroID. `readability-verification` carries the name of Readability, a closed service; `norton-safeweb` is a truncated form of Norton's registered name; `pagekey` has no documented reader at all. Seven of the eight prove nothing to anyone. The last is an open question: `verify-v1` may still hold a Google Search Console verification for a site that never added `google-site-verification`. Current verification tags such as `google-site-verification` and `msvalidate.01` stay quiet.

## Why avoid

The HTML Standard's predefined metadata names include none of the eight. Its "Other metadata names" section lets anyone use an unregistered name, so a name stays useful only while something reads it. The WHATWG MetaExtensions registry records who once did:

- `verify-v1`: "Superseded by google-site-verification. Legacy verification for Google Sitemaps."
- `y_key`: "Used to verify ownership for Yahoo! Site Explorer". Yahoo merged Site Explorer into Bing Webmaster Tools and closed it on 21 November 2011.
- `blogcatalog`: "Used to verify ownership of Blog Catalog.com", an Incomplete proposal because its "Claimed spec link is not a link to a spec".
- `alexaverifyid`: "Used to verify ownership of Alexa Search". Alexa's FAQ asked site owners to put the tag in `<head>`, and Amazon retired Alexa.com on 1 May 2022.
- `norton-safeweb`: Norton's registered name is `norton-safeweb-site-verification`. The bare `norton-safeweb` matches no documented reader.

The rest have no registry entry. `microid` is MicroID's ownership claim, defined in an individual Internet-Draft that expired without becoming an RFC. `readability-verification` names Readability, a read-later service that shut down on 30 September 2016; no source documents what read the tag, and the service is gone either way. `pagekey` has neither a registry entry nor a service that documents it. Google's list of supported meta tags names `google-site-verification` and none of these, and Google states it "will ignore meta tags that it doesn't support".

`verify-v1` is the one name whose reader is unsettled. Google's last public word on it, from December 2012, says Search "currently" supports "ye olde format", and Search Console's help page says a verification lasts only as long as Search Console can confirm the token. No later statement says whether Search Console still recognizes the `verify-v1` spelling.

## Use instead

Delete the element for the seven dead names. Verification now lives in each search engine's console, through the token it issues today:

```html
<meta name="google-site-verification" content="token-from-search-console">
```

For `verify-v1`, confirm in Search Console that the property is verified through the current `google-site-verification` token, or another method, before deleting the legacy one. Deleting it first can revoke a verification Search Console still checks.

## Detectability

Detectable with the selector alone. The comma lists every name with `=` (a single value, not a token set) and the `i` flag folds case. Anything unlisted stays quiet by construction. The logic module in `packages/rules/logic/meta/verification-names.ts` decides only whether the autofix runs.

The autofix deletes the element for seven names. `verify-v1` carries no fix: it may still hold a Search Console verification for a site that verified through it and never added `google-site-verification`.

## Resources

- [WHATWG HTML: Other metadata names](https://html.spec.whatwg.org/multipage/semantics.html#other-metadata-names): anyone may use an unregistered name; the predefined set above it names none of the eight.
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): `verify-v1` superseded by `google-site-verification`, `y_key` for Yahoo! Site Explorer, `alexaverifyid` for Alexa, `blogcatalog` an Incomplete proposal, and Norton's name spelled `norton-safeweb-site-verification`.
- [Google Search Central: Meta tags that Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags): `google-site-verification` is the verification tag Google reads; "Google will ignore meta tags that it doesn't support".
- [Google Search Central: Webmaster Tools verification strategies (December 2012)](https://developers.google.com/search/blog/2012/12/webmaster-tools-verification-strategies): "currently supporting ye olde format" for the legacy verification tag, with no later statement withdrawing it.
- [Search Console Help: Verify your site ownership](https://support.google.com/webmasters/answer/9008080): verification "lasts as long as Search Console can confirm the presence and validity of your verification token".
- [Alexa FAQ: How do I claim my site? (archived 2010)](https://web.archive.org/web/2010/http://www.alexa.com/faqs/?p=188): "include an Alexa meta tag in the <head> section of your site's html code".
- [Alexa.com end-of-service notice (archived 2023-01-01)](https://web.archive.org/web/20230101023829/https://www.alexa.com/): "We retired Alexa.com on May 1, 2022".
- [Search Engine Roundtable: Yahoo Site Explorer closing down today](https://www.seroundtable.com/goodbye-yahoo-site-explorer-14346.html): Site Explorer, the reader of `y_key`, closed on 21 November 2011.
- [IETF Datatracker: draft-miller-microid](https://datatracker.ietf.org/doc/draft-miller-microid/): the MicroID specification, an expired individual Internet-Draft.
- [Readability: the bookmarking service will shut down on September 30, 2016](https://medium.com/@readability/the-readability-bookmarking-service-will-shut-down-on-september-30-2016-1641cc18e02b): the service `readability-verification` is named for closed.
