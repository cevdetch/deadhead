---
ruleId: "link/microsummary"
title: "<link rel=\"microsummary\">"
description: "A live-bookmark generator hook whose single consumer dropped it in Firefox 6."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="microsummary" i]'
fix: { op: "remove-tokens", attr: "rel" }
replacement: "Delete the tag, or only the keyword when rel also holds live ones. Live bookmark titles no longer exist anywhere to point at."
tags: ["mozilla"]
impacts: ["maintainability"]
related: ["link/subresource"]
---

A `link rel=microsummary` names a generator for live bookmark titles. Firefox added
microsummaries in Firefox 2 and dropped them in Firefox 6 as seldom used, undiscoverable and
unmaintained; no other engine ever carried it.

Mozilla's wiki describes microsummaries as "regularly-updated short summaries of web pages",
compact enough to replace a bookmark's static title. The link pointed at a generator, an XML
file served as `application/x.microsummary+xml` that "contains instructions for extracting
information from the contents of the page".

## Why avoid

Bugzilla 524091 removed microsummary support, verified fixed for Firefox 6. Its title gives the
reason: "Seldom used, undiscoverable and unmaintained", and the report notes that the feature,
"added with Firefox 2.0", "did not pick up any traction". Bugzilla 745410 then removed the
remaining microsummary support from bookmarks. The leftovers are gone too.

It never entered any standard. The HTML Standard's list of supported `rel` tokens, the list
`relList.supports()` answers from, names thirteen keywords with no `microsummary` among them.

A tag naming a generator that no longer runs is worse than absent. Bookmark titles never update,
the generator file it points at is fetched by nothing, and a reader of the head assumes some
feature depends on it. Where the generator file is still deployed, it is dead code on the server
as well as in the page.

## Use instead

Delete the tag, and the generator file with it. No browser reads either:

```html
<!-- Before -->
<link rel="microsummary" type="application/x.microsummary+xml" href="/microsummary.xml">

<!-- After: nothing -->
```

There is no successor hook: live bookmark titles exist in no current engine. A page that wants
readers to follow changing values can offer a feed with
`<link rel="alternate" type="application/atom+xml" href="/feed.xml">`, which feed readers pick
up, or a clear `<title>` that a bookmark keeps as written.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `rel` matches with `~=` because it is a space-separated token
set, and the `i` flag folds case. No engine ships support for the token, so every match trips
the rule. The fix removes the `microsummary` keyword, and the element with it when no other
keyword is left.

## Resources

- [Bugzilla 524091: remove microsummaries support](https://bugzilla.mozilla.org/show_bug.cgi?id=524091): "Seldom used, undiscoverable and unmaintained", added with Firefox 2.0, verified fixed for Firefox 6.
- [MozillaWiki: Microsummaries](https://wiki.mozilla.org/Microsummaries): "regularly-updated short summaries of web pages", and generators with "instructions for extracting information from the contents of the page".
- [Bugzilla 745410: remove remaining microsummary and dynamic container support from bookmarks](https://bugzilla.mozilla.org/show_bug.cgi?id=745410): resolved fixed, removing the leftovers.
- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): the possible supported tokens for `rel` list thirteen keywords with no `microsummary` among them.
