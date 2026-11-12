---
ruleId: "link/sidebar"
title: "<link rel=\"sidebar\">"
description: "A Firefox-alone sidebar hint dropped in Firefox 63; other engines always treated it as a plain link."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="sidebar" i]'
fix: { op: "remove-tokens", attr: "rel" }
replacement: "Delete the tag, or only the keyword when rel also holds live ones. Link the destination as a plain link instead: <a href=\"/help\">Help</a>."
tags: ["mozilla"]
impacts: ["maintainability"]
related: ["link/subresource"]
---

A `link rel=sidebar` promises sidebar delivery and delivers a plain link at best. The HTML
Standard dropped the keyword in 2016, and Firefox removed the last of the feature in version 63.

`rel="sidebar"` marked a link whose target was meant for a "secondary browsing context", a panel
beside the main page. In Firefox and in Opera's Presto engine, following such a link offered to
create a bookmark that opened the page in the browser's sidebar. Internet Explorer, Safari and
Chrome treated it as an ordinary link. The WHATWG's HTML 5 draft added the keyword, and it
stayed in the standard until 2016.

## Why avoid

WHATWG issue 582 found that "all browsers besides Firefox treat links with `rel="sidebar"` as a
normal link", and that the situation had not changed since 2009. The HTML Standard removed
secondary browsing contexts and `rel="sidebar"` with them in February 2016. Bugzilla 1452645
then removed Firefox's "Open in Sidebar" bookmark feature, verified fixed for Firefox 63, on the
grounds that it "has received no love and has lots of issues".

The keyword is now outside the standard. The HTML Standard's list of supported `rel` tokens, the
list `relList.supports()` answers from, names thirteen keywords with no `sidebar` among them.

On a `<link>` in the head the tag does even less than on an `<a>`. A `<link>` with a hyperlink
type is not something a visitor can click, so no browser offers the destination anywhere,
sidebar or not. The page the author meant to promote is invisible to readers, and the reader of
the head assumes it is offered.

## Use instead

Link the destination where people can see it:

```html
<!-- Before: nothing shows this link -->
<link rel="sidebar" href="/help">

<!-- After -->
<a href="/help">Help</a>
```

A link meant to open beside the page can open in a new tab with `target="_blank"`. A browser
extension that needs a sidebar panel uses the extension sidebar APIs, such as `sidebar_action`
in Firefox and the side panel API in Chrome, which no web page markup can trigger.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `rel` matches with `~=` because it is a space-separated token
set, and the `i` flag folds case. No engine ships support for the token, so every match trips
the rule. The rule covers `<link>` alone; an `<a rel="sidebar">` is an ordinary link and stays
quiet. The fix removes the `sidebar` keyword, and the element with it when no other keyword is
left.

## Resources

- [WHATWG HTML issue 582](https://github.com/whatwg/html/issues/582): Firefox alone implemented it, while "all browsers besides Firefox treat links with `rel="sidebar"` as a normal link"; closed with the removal in February 2016.
- [WHATWG blog: The road to HTML 5, link relations (2009)](https://blog.whatwg.org/the-road-to-html-5-link-relations#rel-sidebar): `rel=sidebar` "New in HTML 5", its behaviour in Opera and Firefox, and IE, Safari and Chrome treating it as a regular link.
- [Bugzilla 1452645: remove "Open in Sidebar" feature](https://bugzilla.mozilla.org/show_bug.cgi?id=1452645): verified fixed for Firefox 63, with the "no love" rationale.
- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): the possible supported tokens for `rel` list thirteen keywords with no `sidebar` among them.
