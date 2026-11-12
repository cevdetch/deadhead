---
ruleId: "attr/iframe-allowpaymentrequest"
title: "<iframe allowpaymentrequest>"
description: "allowpaymentrequest is removed; write allow=\"payment\" instead, or Chrome grants payment to every origin."
pubDate: "2026-09-23"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "iframe[allowpaymentrequest]"
fix: { op: "none" }
replacement: "Use allow=\"payment\", which grants the frame's src origin; allow=\"payment *\" reproduces the old grant to every origin."
tags: ["embedding"]
impacts: ["security", "maintainability"]
related: ["attr/iframe-presentational"]
---

`<iframe allowpaymentrequest>` let a framed checkout call the Payment Request API. HTML removed
the attribute in 2020 and moved the permission to the `allow` attribute, where every other
delegated feature lives. Chrome still reads the old spelling, and grants more with it than the
new one does.

The Payment Request API shows the browser's own payment sheet. By default only the top-level
page and same-origin frames can call it, so a checkout embedded from a payment provider's origin
needs the parent to delegate the permission. `allowpaymentrequest` was the first way to do that,
a boolean attribute on the frame. Permissions Policy later gave every powerful feature the same
mechanism, `allow="feature"`, and payment moved there.

## Why avoid

whatwg/html#5915, "Remove allowpaymentrequest attribute", landed on 2020-09-16 with the
implementer record in its description: "Never implemented in WebKit/Safari", "Never shipped in
Firefox", and Chrome in favour of deprecating it. Firefox followed in version 83: bug 1665252,
"allowpaymentrequest attribute on iframe is deprecated". The HTML Standard does not list the
attribute among its obsolete features; it is gone.

Chrome kept a compatibility path. Blink's `HTMLIFrameElement` reads the attribute and, when
`allow` sets no `payment` policy, enables payment "for all origins". When `allow` does set one,
Blink logs "Allow attribute will take precedence over 'allowpaymentrequest'", and a use counter
measures whether the attribute still changes anything. The old attribute's grant reaches every
origin the frame navigates to, wider than `allow="payment"`, which covers the frame's `src`
origin.

The result differs by browser. In Chrome the frame can request payment from any origin it ends
up on; Safari never implemented the attribute and no Firefox release shipped it, so a checkout
that relies on it gets no grant from it there.

## Use instead

Delegate the feature through `allow`, the mechanism the standard now uses:

```html
<!-- Before -->
<iframe src="https://pay.example.com/checkout" allowpaymentrequest></iframe>

<!-- After: payment for the frame's src origin -->
<iframe src="https://pay.example.com/checkout" title="Checkout" allow="payment"></iframe>
```

Write `allow="payment *"` where the frame needs the old reach, or name origins:
`allow="payment https://pay.example.com https://3ds.example.net"`. The Payment Request
specification gives the `payment` feature a default allowlist of `'self'`, so the parent's own
`Permissions-Policy` response header has to allow it too when it sets `payment` at all, for
example `Permissions-Policy: payment=(self "https://pay.example.com")`.

## Detectability

Detectable with the selector alone: `iframe[allowpaymentrequest]`. The CLI, the bookmarklet and
the ESLint plugin report the same findings, and none skips.

There is no autofix. Chrome still acts on the attribute, so deleting it withdraws the payment
grant there, and the replacement adds markup, which no fix op writes.

## Resources

- [whatwg/html#5915: Remove allowpaymentrequest attribute](https://github.com/whatwg/html/pull/5915): merged 2020-09-16; "Never implemented in WebKit/Safari", "Never shipped in Firefox".
- [Mozilla bug 1665252](https://bugzilla.mozilla.org/show_bug.cgi?id=1665252): "allowpaymentrequest attribute on iframe is deprecated", fixed in Firefox 83.
- [Chromium: html_iframe_element.cc](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/html_iframe_element.cc): with no `payment` policy in `allow`, the attribute enables payment "for all origins".
- [W3C Payment Request API: permissions policy integration](https://w3c.github.io/payment-request/#permissions-policy): the `payment` feature and its default allowlist of `'self'`.
- [MDN: `Permissions-Policy: payment`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/payment): the directive, and the `allow` attribute on `<iframe>`.
