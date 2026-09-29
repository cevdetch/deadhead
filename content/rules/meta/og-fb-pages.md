---
ruleId: "meta/og-fb-pages"
title: "<meta property=\"fb:pages\">"
description: "Facebook's Page claim for Instant Articles, which Meta switched off in 2023. Nothing reads it, and Meta's current docs never name it."
pubDate: "2026-09-29"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[property="fb:pages" i]'
fix: { op: "remove-element" }
replacement: "Delete it. Instant Articles closed in 2023; link previews need og:title, og:type, og:image and og:url, plus fb:app_id for Insights."
tags: ["social"]
impacts: ["maintainability"]
related: ["meta/og-contact-properties"]
---

`<meta property="fb:pages">` tied a site's articles to a Facebook Page for Instant Articles,
Facebook's fast in-app copies of publishers' stories. Meta shut Instant Articles down in 2023.
The property had no other documented job, and nothing reads it now.

## Why avoid

A publisher registered its site with a Facebook Page, and each article carried the Page ID.
Facebook's Crawler Ingestion guide asked for `<meta property="fb:pages" content="{PAGE_ID}">`
as "The ID of the Facebook Page as the destination of the imported Instant Articles content".
Facebook's claim check reported "The fb:pages tag on the url doesn't contain this page's id"
when the two did not match.

Meta ended the product: "As of April 20, 2023, the Instant Articles API no longer returns
data. Instant Articles API endpoints cannot be called on v17 or later and will be removed
entirely on August 21, 2023." Meta's current Sharing for Webmasters guide lists `og:url`,
`og:title`, `og:description`, `og:image` and `fb:app_id` for link previews, and does not
mention `fb:pages`.

## Use instead

Delete the tag. Keep the four properties Open Graph requires, which Facebook's link previews read:

```html
<meta property="og:title" content="Article title">
<meta property="og:type" content="article">
<meta property="og:image" content="https://example.com/cover.jpg">
<meta property="og:url" content="https://example.com/article">
```

## Detectability

Detectable with a selector. The CLI, the bookmarklet and the ESLint plugin report the same
findings; none skips. The selector `meta[property="fb:pages" i]` reports the tag whatever
its `content`: a list of Page IDs was the documented value, and no reader exists for any
value.

The autofix removes the element. No current Meta document names the property, and link
previews run on the `og:` tags and `fb:app_id`.

## Resources

- [Facebook for Developers: Instant Articles, Crawler Ingestion (archived 2018-03-09)](https://web.archive.org/web/20180309025910/https://developers.facebook.com/docs/instant-articles/crawler-ingestion): `<meta property="fb:pages" content="{PAGE_ID}">`, "The ID of the Facebook Page as the destination of the imported Instant Articles content".
- [Meta for Developers: Instant Articles (archived 2023-06-01)](https://web.archive.org/web/20230601/https://developers.facebook.com/docs/instant-articles/): "As of April 20, 2023, the Instant Articles API no longer returns data ... will be removed entirely on August 21, 2023".
- [Meta for Developers: A Guide to Sharing for Webmasters](https://developers.facebook.com/docs/sharing/webmasters/): the tags Meta reads for sharing, `fb:app_id` among them and `fb:pages` absent.
- [Facebook for Developers: Instant Articles, Publishing Tools (archived 2019)](https://web.archive.org/web/2019/https://developers.facebook.com/docs/instant-articles/claim-url/): registering a URL meant you "input the tag specified on that page in the <head> tag of your website's HTML", and "separate each Page ID with a comma".
