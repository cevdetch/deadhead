---
ruleId: "document/doctype"
title: "Missing or non-standard doctype"
description: "The page lacks <!doctype html>. A missing one triggers quirks mode; a legacy one, quirks or limited quirks by its identifiers."
pubDate: "2026-09-14"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Start the file with <!doctype html>, before <html>; only comments and whitespace may come before it."
tags: ["doctype"]
impacts: ["interop"]
related: ["head/charset-position", "document/html-lang"]
---

A page without `<!doctype html>` as its first line risks quirks mode. In HTML the doctype
has exactly one form:
`<!doctype html>`. It declares no version and points at no DTD. Its only job left is to tell
the browser to render the page by today's rules. Leave it out, or keep an old
`<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">`, and many browsers switch to
a compatibility mode instead.

## Why avoid

The HTML Standard is blunt about it: "A DOCTYPE is a required preamble. DOCTYPEs are required for
legacy reasons. When omitted, browsers tend to use a different rendering mode that is incompatible
with some specifications." The only conforming form is `<!DOCTYPE html>`, in any letter case. A
generator that can't produce that may add the legacy string, as in
`<!DOCTYPE html SYSTEM "about:legacy-compat">`, which the standard allows but discourages.

The parser uses the doctype to choose the rendering mode, and the rules are written into the
standard:

- **No doctype** means quirks mode, always.
- **Old public identifiers** mean quirks mode. The list covers HTML 2.0 to 3.2, HTML 4.0, vendor
  DTDs, and HTML 4.01 Transitional or Frameset when the system identifier is missing.
- **XHTML 1.0 Transitional or Frameset**, and HTML 4.01 Transitional or Frameset with a system
  identifier, mean limited-quirks mode.
- **Anything else** that isn't `<!DOCTYPE html>` is still a parse error, but renders normally.

Quirks mode isn't cosmetic. The Quirks Mode Standard lists what changes: percentage heights are
calculated differently, `html` and `body` stretch to fill the viewport, table cells size
themselves by old rules, tables stop inheriting `color` and text decoration, and CSS accepts
unitless lengths and hex colours without a `#`. MDN puts it plainly: "In quirks mode, layout
emulates behavior in Navigator 4 and Internet Explorer 5." Limited-quirks mode keeps one of those
rules, the line height calculation quirk, which is where the classic gap under images in table
cells comes from.

The result is a page that renders by rules no modern stylesheet is written for. The same CSS
behaves differently on this page than on the rest of a site, and the cause is invisible unless
someone checks `document.compatMode`, which reads `BackCompat` in quirks mode.

## Use instead

Make `<!doctype html>` the first line of every page:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>…</title>
  </head>
  <body>
  </body>
</html>
```

Comments and whitespace may come before it, and so may a byte order mark. Text or any element may
not: after those, the parser has already chosen quirks mode and ignores the doctype.

## Detectability

Detectable in all three runtimes. The rule mirrors the parser's own test: the doctype must be
named `html`, have no public identifier, and have either no system identifier or
`about:legacy-compat`. The rule reports a missing doctype on the `<html>` element. It reports
a doctype after text
or an element as missing too, because the browser ignores it.

Every non-conforming doctype is reported, including the few, like HTML 4.01 Strict, that render
in no-quirks mode. The finding's detail names what is wrong rather than the rendering mode.

The rule misses some malformed doctypes: one that switches the parser to quirks mode while still
reading as a plain `html` doctype, such as `<!DOCTYPE html bogus>`, and an explicitly empty
identifier, such as `PUBLIC ""`. There is no autofix, because changing a doctype changes the
rendering mode, which is the one thing a fix must never do.

## Resources

- [HTML Standard: The DOCTYPE](https://html.spec.whatwg.org/multipage/syntax.html#the-doctype): the doctype is required; `<!DOCTYPE html>` is its only form, plus the discouraged legacy string.
- [HTML Standard: The "initial" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#the-initial-insertion-mode): which doctypes are parse errors, which set quirks or limited-quirks mode, and that a missing doctype sets quirks mode.
- [Quirks Mode Standard](https://quirks.spec.whatwg.org/): the CSS and layout differences in quirks and limited-quirks mode.
- [MDN: Quirks mode and standards mode](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Quirks_mode_and_standards_mode): the three modes, and `document.compatMode` as the way to check.
