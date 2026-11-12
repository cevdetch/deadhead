---
ruleId: "meta/http-equiv-x-security-pragmas"
title: "<meta http-equiv> X-security pragmas"
description: "Retired XSS and CSP names do nothing; delete the tag and send a CSP header."
pubDate: "2026-09-14"
status: "avoid"
severity: "deprecated"
standardsBasis: "browser-convention"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv]'
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete the tag. If policy is wanted, send a Content-Security-Policy response header."
tags: ["csp", "http-equiv"]
impacts: ["security"]
related: ["meta/http-equiv-header-only-pragmas"]
---

Three `http-equiv` values name security mechanisms that no longer exist even as headers.
`X-XSS-Protection` switched the reflected-XSS filter of Internet Explorer, Chrome and Safari.
`X-WebKit-CSP` and `X-Content-Security-Policy` were the prefixed names under which Chrome,
Safari and Firefox shipped Content Security Policy before the standard header existed.

MDN's compatibility data records the ends. Chrome removed its XSS Auditor in version 78, Edge in
17 and Safari in 15.4; Firefox never had one. The unprefixed `Content-Security-Policy` header
arrived in Chrome 25, Firefox 23 and Safari 7, and replaced the prefixed names.

## Why avoid

The auditor is gone and the prefixed headers are retired. MDN marks `X-XSS-Protection`
deprecated and non-standard, and warns that "X-XSS-Protection can create XSS vulnerabilities in
otherwise safe websites": the filter's own blocking could be turned against a page. Chrome's CSP
documentation says to ignore the prefixed headers: modern browsers support the unprefixed
`Content-Security-Policy` header. Unlike the header-only family, there is no live header
spelling to move these to.

The prefixed policies were also written in an older dialect. Firefox's
`X-Content-Security-Policy` used `allow` where CSP 1.0 uses `default-src`, and `xhr-src` where
it uses `connect-src`, so a policy copied from one of these tags does not carry over word for
word.

The risk is false comfort. A head with three security tags reads as hardened, and a review that
stops there misses that the page has no policy at all.

## Use instead

Delete the tags, and write a real policy in the standard syntax. A response header is the
complete form:

```html
<!-- Before: no browser reads any of these -->
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
<meta http-equiv="X-Content-Security-Policy" content="allow 'self'">
```

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
```

MDN describes the XSS filter as "largely unnecessary in modern browsers when sites implement a
strong Content-Security-Policy that disables the use of inline JavaScript ('unsafe-inline')".
Where a header cannot be set, the unprefixed name works as a pragma:
`<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`. The CSP
specification limits that form: it ignores `report-uri`, `frame-ancestors` and `sandbox`, and
"policies in meta elements are not applied to content which precedes them", so the tag has to
come first in the head.

## Detectability

The rule pre-filters with `meta[http-equiv]`: the verdict depends on whether the trimmed value,
compared ASCII case-insensitively, is one of the three prefixed security keywords. The decision
therefore lives in `packages/rules/logic/meta/http-equiv-x-security-pragmas.ts`. The CLI, the
bookmarklet and the ESLint plugin report the same findings, and none skips. The unprefixed
`Content-Security-Policy` pragma stays out of this rule. The fix removes the element: nothing
reads these values, and there is no header to move them to.

## Resources

- [MDN: X-XSS-Protection](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection): deprecated, non-standard response header; it "can create XSS vulnerabilities in otherwise safe websites", and CSP makes it "largely unnecessary".
- [Chrome: Content Security Policy](https://developer.chrome.com/docs/privacy-security/csp): ignore the X-WebKit-CSP / X-Content-Security-Policy prefixed headers; use the unprefixed Content-Security-Policy header.
- [Content Security Policy Level 3: the `meta` element](https://w3c.github.io/webappsec-csp/#meta-element): `report-uri`, `frame-ancestors` and `sandbox` are not supported in `meta`, and a meta policy does not apply to content before it.
- [Mozilla Security Blog: Content Security Policy 1.0 lands in Firefox (2013)](https://blog.mozilla.org/security/2013/06/11/content-security-policy-1-0-lands-in-firefox/): the original implementation's `allow` directive "has been replaced by the 'default-src' directive in CSP 1.0".
- [MDN browser-compat-data: `X-XSS-Protection` and `Content-Security-Policy`](https://github.com/mdn/browser-compat-data/tree/main/http/headers): the auditor removed in Chrome 78, Edge 17 and Safari 15.4; the unprefixed header from Chrome 25, Firefox 23 and Safari 7, with the prefixed names before it.
