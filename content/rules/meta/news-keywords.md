---
ruleId: "meta/news-keywords"
title: "<meta name=\"news_keywords\">"
description: "A Google News keyword list the crawler stopped reading in 2017."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="news_keywords" i]'
fix: { op: "remove-element" }
replacement: "Delete the element. Topic relevance lives in the page content, not in a hidden list: <meta name=\"description\" content=\"A short, accurate, human-written summary of the page.\">."
tags: ["search"]
impacts: ["seo", "maintainability"]
related: ["meta/keywords"]
---

A `meta name=news_keywords` is a keyword list for a consumer that left in 2017. Google announced
the tag for News publishers in 2012 and stopped reading it five years later.

The tag was Google News' own variant of `keywords`. Google's help page explained that its
crawler "makes use of a Google-specific metatag to help determine how to best classify your
content": a publisher could list up to ten phrases, separated by commas, such as
`World Cup, soccer` to tell a football story from a rugby one.

## Why avoid

Google announced the tag on the Google News Blog on 19 September 2012. Support ended without an
announcement: the help content was gone by October 2017, and when a publisher asked about it in
February 2018, John Mueller answered: "it looks like we dropped support for this around the time
when we removed it from the help center. Keeping it on pages is fine, we just don't use it for
Google News anymore." Google's SearchLiaison account added the next day that there is "no need
to remove news_keywords meta tags from pages with them nor add them to new pages, as Google will
eventually ignore the tags entirely."

The live supported-tags list names no `news_keywords`. No consumer remains on Google's side to
read the list.

Like its plain twin, the tag publishes the keyword strategy to competitors in `view-source`
while going stale unreviewed. Nothing reads it and no test covers it, so a newsroom that keeps
filling in the field spends editor time on output nobody uses.

## Use instead

Delete the element, and the CMS field that fills it. Nothing replaces it, because nothing was
being done. Put the distinguishing terms where readers and crawlers see them, in the headline,
the description and the text:

```html
<!-- Before -->
<meta name="news_keywords" content="cycle lanes, city council, transport">

<!-- After: a headline and description that say what the article is about -->
<title>Council approves cycle lanes on the high street - Example News</title>
<meta name="description" content="The city council voted to add protected cycle lanes to the high street from next spring.">
```

For articles, Google documents `NewsArticle` structured data with the headline, dates, author
and image, which describes the article without a hidden keyword list.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `name` matches with `=` because it holds a single value, not a
token set, and the `i` flag folds case. No crawler reads the name, so every match trips the
rule. The fix removes the element: Google no longer reads it, so nothing changes.

## Resources

- [Google News Blog: a newly hatched way to tag your news articles](https://news.googleblog.com/2012/09/a-newly-hatched-way-to-tag-your-news.html): the September 2012 announcement of the tag for News publishers.
- [Search Engine Roundtable: support dropped](https://www.seroundtable.com/google-news-meta-keywords-tag-no-longer-supported-25270.html): the old help text (up to ten comma-separated phrases), Mueller's February 2018 confirmation and SearchLiaison's note, quoted verbatim.
- [Google Search Central: meta tags Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags): the live supported list, with no mention of the name.
- [Google Search Central: article structured data](https://developers.google.com/search/docs/appearance/structured-data/article): `NewsArticle` markup with headline, dates, author and image.
