---
ruleId: "meta/fragment"
title: "<meta name=\"fragment\">"
description: "Opt-in to Google's AJAX crawling scheme, withdrawn in 2015 and switched off in 2018. Yandex ignores it too, and no browser reads it."
pubDate: "2026-09-29"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="fragment" i]'
fix: { op: "remove-element" }
replacement: "Delete it. Google and Yandex render JavaScript pages themselves; serve real URLs through the History API, not #! fragments."
tags: ["search"]
impacts: ["maintainability"]
related: ["meta/news-keywords", "meta/google-value"]
---

`<meta name="fragment" content="!">` opted a page into Google's AJAX crawling scheme of 2009.
Google withdrew the scheme in 2015 and stopped using it in 2018, and Yandex ignores the tag.
No browser reads it, so it sits in the page and does nothing.

## Why avoid

The scheme served pages built with JavaScript, when crawlers could not run it. A page opted
in with a `#!` URL or this tag, and Googlebot then fetched a server-rendered copy at
`?_escaped_fragment_=`. On 2015-10-14 Google wrote: "We are no longer recommending the AJAX
crawling proposal we made back in 2009." On 2017-12-04 it set the end date: "in the second
quarter of 2018, we'll be switching to rendering these pages on Google's side ... we'll no
longer be using the AJAX crawling scheme."

Yandex followed. Its help page says of the tag: "the bot will ignore it and index the
original page." Bing called the `#!` protocol "overly-complicated" in 2013 and pointed
publishers to the History API.

## Use instead

Delete the tag. Serve each view at a real URL through the History API, and render content
the crawler can read:

```html
<a href="/clothes">Clothes</a>
```

## Detectability

Detectable with a selector. The CLI, the bookmarklet and the ESLint plugin report the same
findings; none skips. The selector `meta[name="fragment" i]` reports the tag whatever its
`content`: the scheme defined `content="!"`, and no reader exists for any value.

The autofix removes the element. Neither Google nor Yandex reads it, and `#!` URLs, History
API URLs and any `?_escaped_fragment_=` handler on the server keep working as before.

## Resources

- [Google Search Central Blog: Deprecating our AJAX crawling scheme (2015-10-14)](https://developers.google.com/search/blog/2015/10/deprecating-our-ajax-crawling-scheme): "We are no longer recommending the AJAX crawling proposal we made back in 2009."
- [Google Search Central Blog: Rendering AJAX-crawling pages (2017-12-04)](https://developers.google.com/search/blog/2017/12/rendering-ajax-crawling-pages): the scheme "accepts pages with either a #! in the URL or a fragment meta tag", and "in the second quarter of 2018 ... we'll no longer be using the AJAX crawling scheme".
- [Yandex Webmaster: Indexing AJAX sites](https://yandex.com/support/webmaster/en/robot-workings/ajax-indexing.html): "If you previously used the meta name="fragment" content="!" meta tag to indicate the HTML version of AJAX pages, the bot will ignore it and index the original page."
- [Bing Webmaster Blog: Search Engine Optimization Best Practices for AJAX URLs (2013-03-21, archived)](https://web.archive.org/web/20170129140432/https://blogs.bing.com/webmaster/2013/03/21/search-engine-optimization-best-practices-for-ajax-urls/): "developers had to rely on overly-complicated protocols such as "crawlable AJAX", which uses the #! ("Hash bang") signature".
