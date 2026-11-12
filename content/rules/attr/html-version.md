---
ruleId: "attr/html-version"
title: "<html version>"
description: "version on html is unnecessary; the doctype already declares the standard, so delete it."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "html[version]"
fix: { op: "remove-attribute", attr: "version" }
replacement: "Delete the attribute: <html lang=\"en\">. The doctype already declares HTML."
tags: ["doctype"]
impacts: ["maintainability"]
related: ["attr/html-manifest"]
---

`version` on `html` labels nothing the parser reads. The HTML Standard calls the attribute
unnecessary, with one direction: omit it altogether. The doctype alone decides how a page
parses, and no browser ever switched modes on the label.

The attribute comes from HTML 4.01, which already deprecated it on arrival: its value "specifies
which HTML DTD version governs the current document", and it was deprecated "because it is
redundant with version information provided by the document type declaration". In HTML 4.01's
loose DTD its value was the DTD's own public identifier, the same string the doctype already
carried.

## Why avoid

The HTML Standard's list of non-conforming features names `version` on `html` elements:
"Unnecessary. Omit it altogether." The W3C HTML5 Recommendation printed the same line. The
standard keeps a `version` IDL attribute on `HTMLHtmlElement` that reflects the content
attribute, so script can read the string back, and nothing else consults it.

The label can only restate or contradict. A page with `<!doctype html>` and
`version="-//W3C//DTD HTML 4.01//EN"` parses as HTML in no-quirks mode, whatever the attribute
claims. A reader who trusts the attribute draws the wrong conclusion about the document; a
reader who checks the doctype learns that the attribute adds nothing. Either way the value has
to be kept in step with a doctype that already says it, and it never is.

## Use instead

Delete the attribute and let the doctype speak:

```html
<!-- Before -->
<!doctype html>
<html lang="en" version="-//W3C//DTD HTML 4.01//EN">

<!-- After -->
<!doctype html>
<html lang="en">
```

`<!doctype html>` is the whole declaration a current page needs. If the old doctype is still in
place too, `document/doctype` covers replacing it. A build step or CMS template that writes the
attribute is the place to remove it, so new pages stop carrying it.

## Detectability

Detectable with one selector: `html[version]`. Presence of the attribute is the whole verdict,
so no logic module exists. The CLI, the bookmarklet and the ESLint plugin report the same
findings, and none skips. The autofix removes the attribute and leaves the rest of the start tag
as written: no browser reads it, so nothing changes.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `version` on `html` elements, "Unnecessary. Omit it altogether."; the `HTMLHtmlElement` partial interface that still reflects it.
- [HTML 4.01: the HTML element](https://www.w3.org/TR/html401/struct/global.html#adef-version): "Deprecated", "redundant with version information provided by the document type declaration".
- [W3C HTML5: obsolete features](https://www.w3.org/TR/2014/REC-html5-20141028/obsolete.html): the same line, unnecessary, omit it altogether.
