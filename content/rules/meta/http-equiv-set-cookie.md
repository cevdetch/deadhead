---
ruleId: "meta/http-equiv-set-cookie"
title: "<meta http-equiv=\"set-cookie\">"
description: "http-equiv=set-cookie is non-conforming and has no effect; browsers ignore it, so set cookies with the Set-Cookie response header instead."
pubDate: "2026-09-14"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="set-cookie" i]'
fix: { op: "remove-element" }
replacement: "Send a Set-Cookie response header (or set document.cookie from script); then delete the tag."
tags: ["http-equiv"]
impacts: ["maintainability"]
related: ["meta/http-equiv-cache-pragmas"]
---

`<meta http-equiv="set-cookie">` sets no cookie. It once let markup do what the `Set-Cookie`
response header does, and browsers removed it between 2018 and 2019: Chrome blocked it in
version 65, WebKit removed it in December 2018, and Firefox in version 68. The HTML Standard
lists the pragma as non-conforming: it "has no effect", and "User agents are required to ignore
this pragma".

## Why avoid

The cookie is never set, so whatever depended on the tag is broken, with no error. A preference,
a consent flag or a session marker the server expects comes back missing on the next request,
and the code that reads it falls back to its default.

The removal was a security hardening. Chrome's deprecation notice gives the reason: the tag
could be used "to manipulate existing cookies for a host, or to set new cookies", which "allows
a non-script content injection to upgrade itself to a session fixation attack, even in the
presence of a strong content security policy". An attacker who could inject markup but not
script, the case a strict CSP is built for, could still plant or overwrite a cookie. Requiring
either HTTP headers or script execution for cookies closed that vector, and the HTML Standard
turned the pragma into a no-op to match.

What is left is a tag that looks like cookie management and does nothing. A reader of the head
sees a cookie that does not exist, and an audit of the site's cookies lists one fewer than the
markup suggests.

## Use instead

Set the cookie in the response that serves the page, then delete the tag:

```html
<!-- Before: no browser reads this -->
<meta http-equiv="set-cookie" content="theme=dark; path=/; max-age=31536000">
```

```http
Set-Cookie: theme=dark; Path=/; Max-Age=31536000; Secure; SameSite=Lax
```

The header supports every cookie attribute, including `HttpOnly`, which keeps the cookie out of
reach of scripts, and `Secure`. A static host that cannot add headers per response can set a
cookie from script with `document.cookie`, which cannot set `HttpOnly`; a cookie that needs
`HttpOnly`, such as a session, belongs in a header sent by the server or an edge function.

Check the result in the browser's storage panel, such as Chrome DevTools under Application,
Cookies. A cookie that appeared there before the change came from a header or a script all
along, not from the tag.

## Detectability

Detectable with the selector alone: the pragma is a single element identified by one attribute
value, matched without regard to ASCII case. The CLI, the bookmarklet and the ESLint plugin
report the same findings, and none skips. The fix removes the element: no browser reads it, so
deletion changes nothing. The author still has to re-create the cookie as a header, which is why
the replacement says so.

## Resources

- [HTML Standard: Pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives): "This pragma is non-conforming and has no effect. User agents are required to ignore this pragma."
- [Chrome 65 deprecations](https://developer.chrome.com/blog/chrome-65-deprecations): the removal and its session-fixation rationale, with Intent-to-Remove and tracker links.
- [Mozilla bug 1457503: Remove `<meta http-equiv=set-cookie>` support](https://bugzilla.mozilla.org/show_bug.cgi?id=1457503): the Firefox removal.
- [WebKit bug 185077](https://bugs.webkit.org/show_bug.cgi?id=185077): the WebKit removal, landed in December 2018.
- [MDN: `<meta http-equiv>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/http-equiv): browsers ignore this pragma; use the Set-Cookie response header or `document.cookie` instead.
- [MDN: `Set-Cookie`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie): the header's attributes, and `HttpOnly` forbidding script access.
