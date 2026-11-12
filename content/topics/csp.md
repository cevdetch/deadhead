---
description: "Content Security Policy in a meta tag: what the meta form cannot do, the directives browsers dropped, and the nine rules that report them."
---

[Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
tells the browser which sources a page may load scripts, styles, frames and other resources
from. It is delivered two ways: the `Content-Security-Policy` response header, and
`<meta http-equiv="Content-Security-Policy">`. The two look the same and are not. The CSP
specification strips `frame-ancestors`, `report-uri` and `sandbox` from a meta policy, there
is no report-only mode for it, it does not cover anything parsed before it, and in Chromium
it stops the preload scanner. A page that relies on a meta policy to block framing is
frameable, and nothing says so.

The other problem is age. CSP has gone through three levels and several drafts, and
directives that were dropped live on in copied policies. A policy that still lists them
reads as stronger than the one the browser enforces.

Deadhead reports nine:

- [`meta/http-equiv-content-security-policy`](/rules/meta/http-equiv-content-security-policy):
  every meta policy. Harmful: send the header first, then delete the tag.
- [`meta/csp-referrer`](/rules/meta/csp-referrer): the old `referrer` directive. Harmful,
  because the referrer policy it states never applies; use `<meta name="referrer">`.
- [`meta/csp-report-uri`](/rules/meta/csp-report-uri): reporting in a meta policy, which
  sends nothing.
- [`meta/csp-block-all-mixed-content`](/rules/meta/csp-block-all-mixed-content),
  [`meta/csp-navigate-to`](/rules/meta/csp-navigate-to),
  [`meta/csp-plugin-types`](/rules/meta/csp-plugin-types),
  [`meta/csp-prefetch-src`](/rules/meta/csp-prefetch-src) and
  [`meta/csp-reflected-xss`](/rules/meta/csp-reflected-xss): directives that left the
  specification. `prefetch-src` is the odd one: Safari still enforces it, so one policy acts
  two ways.
- [`meta/http-equiv-x-security-pragmas`](/rules/meta/http-equiv-x-security-pragmas): the
  prefixed `X-Content-Security-Policy` and `X-WebKit-CSP` names and the XSS auditor switch.

Only the last is autofixed. Changing a policy changes what the page may load, so the rest
need a person to rewrite the policy, ideally as a header.
