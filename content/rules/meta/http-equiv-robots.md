---
ruleId: "meta/http-equiv-robots"
title: "<meta http-equiv> robots and X-Robots-Tag"
description: "robots and X-Robots-Tag in http-equiv map to no state, so a noindex written there is ignored. Use <meta name=\"robots\">."
pubDate: "2026-09-14"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="robots" i], meta[http-equiv="x-robots-tag" i]'
fix: { op: "none" }
replacement: "For page-level indexing use <meta name=\"robots\">; for non-HTML resources send X-Robots-Tag as a response header; move crawling rules to robots.txt. Never disallow the same URL in robots.txt."
tags: ["http-equiv", "search"]
impacts: ["seo"]
related: ["meta/http-equiv-description", "meta/http-equiv-header-only-pragmas"]
---

A `robots` or `X-Robots-Tag` in `http-equiv` reaches no crawler. `robots` is a metadata
*name* that ended up in the `http-equiv` attribute, and `X-Robots-Tag` names an HTTP response
header. The pragma table holds neither keyword, so both map to no state and browsers skip
them. Google, Bing, Yandex and Apple each document the same two working forms,
`<meta name="robots">` in markup and `X-Robots-Tag` in the response header, and none
documents a third.

## Why avoid

Directives in this form vanish without a trace. An author who wrote
`http-equiv="robots" content="noindex"` or `http-equiv="X-Robots-Tag" content="noindex"`
believes the page is excluded from results; the page stays indexed and its links stay
followed. The tag must move, not change shape: page-level indexing rules belong in
`<meta name="robots">`, the same rules for non-HTML resources in the `X-Robots-Tag` response
header, and crawling rules in `/robots.txt` at the service root.

The move has its own trap, which the replacement carries: robots.txt governs *crawling*, not
exclusion. Google's guidance is that robots.txt "is not a mechanism for keeping a web page
out of Google". To keep a page out, use noindex. A noindex works only if the page is not
blocked in robots.txt, because a blocked page is never fetched and its noindex never seen.
Bing asks for crawl access to read the tag, and Yandex states that a meta tag or header on a
page robots.txt prohibits does not apply. Disallow in robots.txt or noindex in the page,
never both on the same URL.

## Use instead

For HTML pages, the meta name form:

```html
<meta name="robots" content="noindex">
```

For non-HTML resources such as PDFs or images, the response header:

```http
X-Robots-Tag: noindex
```

For crawling rules, robots.txt:

```http
User-Agent: *
Disallow: /private/
```

## Detectability

Complete detection: one element, two attribute values, matched with the `i` flag. There is
no autofix. Deleting either tag changes nothing a crawler does, since no crawler reads it,
but it deletes the only record of the author's noindex intent. Moving `robots` to the `name`
attribute is a rename, and an automated rename of an ignored indexing directive is the kind
of edit a human should confirm.

## Resources

- [Google Search Central: Robots meta tag, data-nosnippet, and X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): page-level settings go in `<meta name="robots">` on HTML pages or in the `X-Robots-Tag` HTTP response header; documents noindex semantics and the robots.txt interaction.
- [Bing Webmaster Tools: Robots meta tags and attributes that Bing supports](https://www.bing.com/webmasters/help/robots-meta-tags-and-attributes-that-bing-supports-5198d240): every Bing robots value works in `<meta name="robots">` or in the `X-Robots-Tag` response header; Bing must crawl the page to see the tag.
- [Yandex Webmaster: robots meta tag and X-Robots-Tag](https://yandex.com/support/webmaster/controlling-robot/meta-robots.html): the two forms, the meta tag and the `X-Robots-Tag` header; neither applies to a page robots.txt prohibits.
- [Apple Support: About Applebot](https://support.apple.com/en-us/119829): Applebot reads robots meta tags in the `<head>` and the same directives in the `X-Robots-Tag` response header.
- [RFC 9309: Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.txt): crawling rules "MUST be accessible in a file named /robots.txt (all lowercase) in the top-level path of the service."
- [HTML Standard: Pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives): the closed pragma set has no entry for `robots` or `x-robots-tag`, so either `http-equiv` spelling maps to no state.
- [MDN: `<meta name="robots">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/robots): the in-document form is `<meta name="robots">`; Google, Yahoo, and Bing support the directives in the `X-Robots-Tag` HTTP header.
- [MDN: X-Robots-Tag header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Robots-Tag): typed as a response header; indexing rules live in that header or in a robots meta element.
