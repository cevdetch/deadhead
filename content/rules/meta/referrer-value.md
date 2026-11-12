---
ruleId: "meta/referrer-value"
title: "<meta name=\"referrer\"> with unknown token"
description: "An unknown referrer token is ignored, so the page falls back to default and can leak more than intended."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="referrer" i]'
match: "logic"
fix: { op: "none" }
replacement: "Spell the policy from the table: <meta name=\"referrer\" content=\"strict-origin-when-cross-origin\">. Match the token to the leak level the page tolerates."
tags: ["hyperlinks"]
impacts: ["security"]
related: ["meta/robots-value"]
---

A `referrer` tag with a token outside the policy table asks for something no browser honours.
The browser ignores the tag, and the page keeps the policy it had without it: the one a
`Referrer-Policy` header set, or the browser default.

The referrer policy decides what a request tells the server it came from: the full URL of the
page, its origin alone, or nothing. It applies to every request the page makes, including links
the visitor follows and subresources from other hosts. A page whose URLs carry search terms,
account identifiers or reset tokens uses the policy to keep them in.

## Why avoid

The HTML Standard's processing for `<meta name="referrer">` lowercases the `content` value, maps
four legacy keywords onto policies, and then: "If value is a referrer policy, then set element's
node document's policy container's referrer policy to policy." A value that is no policy sets
nothing. A typo swaps the author's choice for the fallback, with nothing visible on the page.

The fallback is not what the author asked for. Since Chrome 85, Firefox 87 and Safari 15, the
default policy is `strict-origin-when-cross-origin`: a cross-origin request carries the page's
origin, none from HTTPS to HTTP, and a same-origin request the full URL. An author who wanted
`no-referrer` and typed `no-referer` sends the site's origin to every linked host, and the full
URL, query string included, with every same-origin request. On a browser from before the change,
the default was `no-referrer-when-downgrade`, which sends the full URL cross-origin over HTTPS.

The policy table names each leak in advance. `origin` and `origin-when-cross-origin` send the
origin even from an HTTPS page to an HTTP one, and `unsafe-url` sends the full URL everywhere:
"The policy's name doesn't lie; it is unsafe." A typo leaves the page at whatever level the
header or the default gives, and that can be any of these.

Two details of the processing make the tag harder to reason about. The standard notes that it
"is not responsive to element removals, and does not use tree order": the most recently inserted
or modified `referrer` tag wins, so a script that adds one later overrides the one in the
markup. And a tag sets the document's policy as the parser reaches it, so requests started
before it use the earlier policy.

## Use instead

Spell the policy from the table, in one token, and place the tag early in the head:

```html
<!-- Before: the misspelt token is ignored -->
<meta name="referrer" content="no-referer">

<!-- After -->
<meta name="referrer" content="no-referrer">
```

Choose the level the page tolerates. `strict-origin-when-cross-origin` is the default and suits
most pages; `same-origin` keeps cross-origin requests from carrying any referrer; `no-referrer`
sends none at all, which also hides the page from referral reports in other sites' analytics. A
`Referrer-Policy` response header sets the same policy for every response a server sends and
applies from the first byte, before the parser reaches any tag. A single element can set its own
with `referrerpolicy`, and a link can drop the referrer with `rel="noreferrer"`.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings, and none skips. The selector prefilters to `referrer` tags; the module
in `packages/rules/logic/meta/referrer-value.ts` trims ASCII whitespace, folds to lowercase, and
demands an exact hit on the eight policies or the four legacy keywords HTML maps onto them
(`never`, `default`, `always`, `origin-when-crossorigin`). Multi-token and empty values trip,
since the field holds a single keyword. The comma-separated list a `Referrer-Policy` header
accepts does not work in the tag. A tag with no `content` stays quiet. There is no autofix: the
intended policy is the author's.

## Resources

- [HTML Standard: the `referrer` metadata name](https://html.spec.whatwg.org/multipage/semantics.html#meta-referrer): the lowercasing, the legacy table, "If value is a referrer policy", and the note that the processing "does not use tree order".
- [W3C: Referrer Policy](https://w3c.github.io/webappsec-referrer-policy/): the eight policies and what each one sends; "The default referrer policy is "strict-origin-when-cross-origin""; of `unsafe-url`, "The policy's name doesn't lie; it is unsafe."
- [MDN: `<meta name="referrer">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/referrer): the values with the default behaviour called out.
- [MDN browser-compat-data: `Referrer-Policy`](https://github.com/mdn/browser-compat-data/blob/main/http/headers/Referrer-Policy.json): `strict-origin-when-cross-origin` as the default since Chrome and Edge 85, Firefox 87 and Safari 15.
