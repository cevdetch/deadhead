---
description: "Obsolete text, list and preformatted elements such as acronym, tt, strike, xmp and plaintext, and the semantic or CSS replacement for each."
---

Early HTML had elements for how text looked and for distinctions nobody could apply
consistently: `<tt>` for monospace, `<strike>` for a line through, `<acronym>` beside
`<abbr>`, `<dir>` beside `<ul>`. HTML5 kept the elements that say what text is and dropped
the rest, listing them as
[obsolete](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features).
Browsers still render most of them, so an old page looks fine, but the meaning a screen
reader or a search engine could use is missing.

A few are traps rather than leftovers. `<plaintext>` has no end tag: everything after it,
including `</body>`, is shown as text. `<xmp>` cannot contain its own end tag, so it cannot
show the markup it was used to show. And the ruby elements `<rb>` and `<rtc>` render
differently across engines: `<rtc>` was Gecko's alone, and Chromium and WebKit misplace its
annotations.

Deadhead reports nine, all deprecated and none autofixed, because each replacement is a
choice about what the text means:

- [`element/tt`](/rules/element/tt): use `code`, `kbd`, `samp` or `var`, or CSS for the
  font alone.
- [`element/strike`](/rules/element/strike): use `del` for a removal or `s` for text that is
  no longer accurate.
- [`element/acronym`](/rules/element/acronym) and [`element/dir`](/rules/element/dir): use
  `abbr` and `ul`, which browsers already treat them as.
- [`element/listing`](/rules/element/listing), [`element/xmp`](/rules/element/xmp) and
  [`element/plaintext`](/rules/element/plaintext): use `pre` and `code` with escaped
  markup, or serve the file as `text/plain`.
- [`element/rb`](/rules/element/rb) and [`element/rtc`](/rules/element/rtc): write base text
  directly inside `ruby`, and nest a second `ruby` for a second annotation.

The [presentational markup](/topics/presentational) topic covers the styling elements, such
as `<font>` and `<center>`.
