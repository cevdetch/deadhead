---
description: "What the doctype still does, the quirks modes a missing or legacy one switches on, and the two rules deadhead uses to check it."
---

The doctype is the first line of an HTML document, and it has one job left: telling the
browser to render the page by current standards. HTML has a single form of it,
`<!doctype html>`, in any letter case. It names no version and points at no DTD.

Older doctypes still change how a page renders, because the parser keeps the history.
The HTML Standard's
[parsing rules](https://html.spec.whatwg.org/multipage/parsing.html#the-initial-insertion-mode)
put a page with no doctype in quirks mode, and so do most HTML 2.0 to 4.01 and vendor
doctypes. XHTML 1.0 Transitional and Frameset, and HTML 4.01 Transitional and Frameset with
a system identifier, get limited-quirks mode. In quirks mode, percentage heights, table
sizing and parts of CSS parsing follow the pre-standard behaviour that the
[Quirks Mode Standard](https://quirks.spec.whatwg.org/) lists, so the same stylesheet lays
out this page differently from the rest of the site. Nothing on the page shows it;
`document.compatMode` reads `BackCompat`.

Deadhead checks two things:

- [`document/doctype`](/rules/document/doctype) reports a page with no doctype, a doctype
  after text or an element, which the browser ignores, and any form other than
  `<!doctype html>` or the permitted `about:legacy-compat` string. It is harmful, and it has
  no autofix: changing the doctype changes the rendering mode.
- [`attr/html-version`](/rules/attr/html-version) reports `version` on `<html>`, a label no
  parser ever read. The doctype already says which language the page is written in, and
  the fix deletes the attribute.

A fragment, such as a layout partial with no `<html>`, is never reported for a missing
doctype: the file that wraps it supplies one.
