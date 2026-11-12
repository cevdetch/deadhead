---
description: "HTTP headers written as meta http-equiv: the few pragmas HTML defines, the many it ignores, and the security headers that only work on the response."
---

`<meta http-equiv>` was meant to let a document carry HTTP headers, on the idea that a
server would read them out of the file and send them. Servers never did, and the HTML
Standard now defines a short
[table of pragmas](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives)
with their own processing: `content-type`, `content-language` (non-conforming),
`default-style`, `refresh`, `set-cookie` (non-conforming, and with no effect),
`x-ua-compatible` and `content-security-policy`. Any other value maps to no state. The tag stays in the page and
the browser ignores it.

That makes most `http-equiv` tags dead weight, and a few of them dangerous. Security headers
such as `X-Frame-Options`, `Strict-Transport-Security` and `X-Content-Type-Options` only work
as response headers, so writing them in a meta tag leaves the page unprotected while it
looks protected. A robots directive in `http-equiv` is not read, so a `noindex` there does
nothing. `refresh` works, and moves the reader on a timer the back button cannot undo. And a
Content Security Policy in meta loses `frame-ancestors`, reporting and sandboxing.

Deadhead reports twenty-seven. The harmful ones:

- [`meta/http-equiv-header-only-pragmas`](/rules/meta/http-equiv-header-only-pragmas),
  [`meta/http-equiv-content-security-policy`](/rules/meta/http-equiv-content-security-policy)
  and [`meta/csp-referrer`](/rules/meta/csp-referrer): protections that are weaker or absent
  in meta.
- [`meta/http-equiv-robots`](/rules/meta/http-equiv-robots) and
  [`meta/http-equiv-refresh`](/rules/meta/http-equiv-refresh).

The rest are pragmas with no effect, grouped by where they come from: caching
([`meta/http-equiv-cache-pragmas`](/rules/meta/http-equiv-cache-pragmas)), Internet Explorer
([`meta/http-equiv-x-ua-compatible`](/rules/meta/http-equiv-x-ua-compatible),
[`meta/http-equiv-ie-pragmas`](/rules/meta/http-equiv-ie-pragmas),
[`meta/http-equiv-pics-p3p`](/rules/meta/http-equiv-pics-p3p)), old CSP directives (the
[CSP topic](/topics/csp)), HTML 4 defaults
([`meta/http-equiv-content-script-style-type`](/rules/meta/http-equiv-content-script-style-type)),
and names that belong in `name` or nowhere
([`meta/http-equiv-metadata-names`](/rules/meta/http-equiv-metadata-names),
[`meta/http-equiv-description`](/rules/meta/http-equiv-description),
[`meta/http-equiv-unregistered-pragmas`](/rules/meta/http-equiv-unregistered-pragmas)). The
full list is below.

The fix for a header-only pragma is a real response header, which a text edit cannot send.
Configure it on the server or host first, then delete the tag.
