---
ruleId: "link/canonical-http"
title: "<link rel=\"canonical\"> with http href"
description: "An http canonical steers consolidation toward the insecure variant."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="canonical" i][href^="http://" i]'
fix: { op: "none" }
replacement: "Point the tag at the https address, serve it with a valid certificate, and redirect the http URL to it: <link rel=\"canonical\" href=\"https://example.com/post\">."
tags: ["search"]
impacts: ["seo"]
related: ["link/canonical-relative", "head/canonical-multiple"]
---

A `link rel=canonical` that points at an `http://` address steers consolidation toward the
insecure variant. Google prefers the https equivalent and names the http pointer a conflicting
signal.

The tag survives migrations. A site moves to HTTPS, the server redirects, the certificate is
valid, and the templates still print a canonical built from a hard-coded `http://` base URL, a
stale setting in the CMS, or the scheme of the request as the app sees it behind a proxy that
terminates TLS. Each page then tells search engines that its preferred address is the one the
site has left.

## Why avoid

Google: "Google prefers HTTPS pages over equivalent HTTP pages as canonical, except when there
are issues or conflicting signals." One of the conflicts it lists is the tag itself: "The HTTPS
page has a `rel="canonical"` `link` to the HTTP page." Google's announcement of HTTPS indexing
by default had set the same condition: it indexes the HTTPS URL if the page "doesn't have a
`rel="canonical"` link to the HTTP page".

Consolidation then pools at the insecure address. Ranking signals gather there, and search
results can link to the http page. Visitors who follow that result go through the redirect,
which costs a round trip, and on a site without HSTS the first request travels unencrypted. The
canonical and the redirect point in opposite directions, so the page sends the crawler two
contradicting answers about the same URL.

The markup itself is legal. RFC 6596 allows the target to differ in scheme, so the harm sits in
the signal, not the syntax: the crawler learns the wrong address as authoritative.

## Use instead

Point the canonical at the https address, and make the other signals agree with it:

```html
<!-- Before: the HTTPS page names its insecure twin -->
<link rel="canonical" href="http://example.com/post">

<!-- After -->
<link rel="canonical" href="https://example.com/post">
```

Google's list of ways to make HTTPS the canonical is short: "Add redirects from the HTTP page to
the HTTPS page. Add a `rel="canonical"` `link` from the HTTP page to the HTTPS page. Implement
HSTS." It also names what pushes the other way: "Avoid bad TLS/SSL certificates and
HTTPS-to-HTTP redirects because they cause Google to prefer HTTP very strongly", and keep the
http URLs out of the sitemap and the hreflang annotations. Build the canonical from the site's
configured origin, not from the incoming request, so that a proxy that terminates TLS cannot
write `http://` into it.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `rel` matches with `~=` because it is a space-separated token
set, and `href` matches with `^=` against the `http://` prefix; the `i` flag folds case. A
canonical with no `href` belongs to `link/href-missing`, and a relative one to
`link/canonical-relative`. An `href` with leading whitespace, which the URL parser strips,
escapes the prefix match. There is no autofix: the https address has to exist and serve the same
page before the canonical can name it.

## Resources

- [Google Search Central: consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): "Google prefers HTTPS pages over equivalent HTTP pages as canonical"; a canonical to the HTTP page as a conflicting signal; redirects, canonicals and HSTS as the fix; bad certificates and HTTPS-to-HTTP redirects to avoid.
- [Google Search Central Blog: indexing HTTPS pages by default](https://developers.google.com/search/blog/2015/12/indexing-https-pages-by-default): indexes the https URL if it "doesn't have a `rel="canonical"` link to the HTTP page", among other conditions.
- [RFC 6596: the canonical link relation](https://www.rfc-editor.org/rfc/rfc6596.txt): allows the target to differ in scheme, with heuristics as the fallback when the designation goes wrong.
- [MDN: `Strict-Transport-Security`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security): HSTS makes the browser use HTTPS for the host without the first insecure request.
