---
description: "Why cache instructions in the HTML head do nothing, what replaced the removed application cache, and the two deadhead rules for both."
---

Browsers and HTTP caches decide what to store, for how long and when to revalidate from
response headers: `Cache-Control`, `Expires`, `ETag` and `Last-Modified`, as
[RFC 9111](https://www.rfc-editor.org/rfc/rfc9111) defines them. Nothing in the HTML head
takes part. Two older ideas say otherwise, and both survive in templates.

The first is the cache pragma: `<meta http-equiv="Cache-Control" content="no-cache">`, or
`Pragma`, `Expires`, `ETag` and `Last-Modified` written the same way. None of them is in the
HTML Standard's
[pragma table](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives), so
the element maps to no state, and no server turns markup into headers. The page is cached
exactly as its headers say. The cost is misdirection: the tag looks like cache control, so
whoever debugs a stale page looks in the wrong place first.

The second is the application cache, which `<html manifest="app.appcache">` enrolled a page
in. Browsers removed it: Chrome stopped supporting it by default in version 85 and deleted
the code around version 95, and Firefox and Safari had deprecated it years before.
[Service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) took
over offline support.

Deadhead reports both:

- [`meta/http-equiv-cache-pragmas`](/rules/meta/http-equiv-cache-pragmas) reports the five
  cache names in `http-equiv`, and the fix deletes the element. If the tag records an
  intent, such as `no-cache` on a page that must not be stored, move it to a response
  header first.
- [`attr/html-manifest`](/rules/attr/html-manifest) reports the `manifest` attribute, and
  the fix deletes it. Register a service worker where the page has to work offline.
