---
description: "Markup that weakens a protection or only looks like one: meta CSP and security headers, dropped CSP directives, late charsets and leaky referrers."
---

A browser's security features are mostly switched on by response headers, not markup.
The rules here report the places where the head looks as if it configures a protection and
does not, or where markup opens a hole of its own. The cost of each is the same: the author
believes something is protected that is not.

The harmful ones fall into four groups:

- **Headers written as meta tags.** `X-Frame-Options`, `Strict-Transport-Security` and
  `X-Content-Type-Options` work only as response headers. A Content Security Policy in meta
  loses `frame-ancestors`, reporting and sandboxing, so a page that relies on it to block
  framing can be framed. See
  [`meta/http-equiv-header-only-pragmas`](/rules/meta/http-equiv-header-only-pragmas) and
  [`meta/http-equiv-content-security-policy`](/rules/meta/http-equiv-content-security-policy).
- **Policies that do not apply.** A `referrer` directive inside CSP, or an unknown token in
  `<meta name="referrer">`, leaves the default referrer policy in place, which can send more
  of the URL than intended.
- **Encoding.** A charset declared late, or as anything but UTF-8, lets the browser guess
  how to decode the page, which is the mechanism behind the old UTF-7 cross-site scripting.
- **Script and integrity.** A JSON-LD value holding `</script>` can end the block and run as
  markup, and `integrity` without `crossorigin` blocks the file it was meant to verify.

The deprecated ones are CSP directives that left the specification, such as `reflected-xss`,
`plugin-types` and `navigate-to`, the prefixed `X-WebKit-CSP` pragmas, and
`allowpaymentrequest`, which Chrome reads more permissively than the `allow="payment"` that
replaced it. A policy that lists them reads as stronger than the one the browser enforces.

Most of these have no autofix. The repair is usually a header on the server, which a text
edit cannot send: configure it, then delete the tag. MDN's
[CSP guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) covers the header
form.
