---
ruleId: "element/acronym"
title: "<acronym>"
description: "acronym is obsolete; browsers already treat it exactly like abbr, so use abbr."
pubDate: "2026-09-14"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "acronym"
fix: { op: "none" }
replacement: "Use abbr: <abbr title=\"World Wide Web\">WWW</abbr>."
tags: ["text"]
impacts: ["maintainability"]
related: ["element/tt", "element/big"]
---

Use `<abbr>`; `<acronym>` is obsolete. HTML 4 had two elements for shortened words: `<abbr>` for
abbreviations and `<acronym>` for acronyms. Nobody agreed on where one ended and the other
began. Is "HTML" an acronym if you spell it out letter by letter? The distinction never did
anything a reader or a browser could use. HTML5 kept `<abbr>` and dropped `<acronym>`.

`<acronym>` stayed in use longer than its definition deserved. Internet Explorer did not support
`<abbr>` until version 7, according to MDN's compatibility data, which gave the other element a
practical reason to exist. That reason ended with those browsers.

## Why avoid

It is obsolete and non-conforming. The HTML Standard lists `acronym` among the elements that
"are entirely obsolete, and must not be used by authors", with a one-line instruction: "Use abbr
instead."

It adds nothing to `<abbr>`. The Standard requires that "user agents must treat acronym elements
in a manner equivalent to abbr elements in terms of semantics and for purposes of rendering",
and its default stylesheet gives `abbr[title]` and `acronym[title]` the same dotted underline.
In the DOM the two differ only in name: both use the plain `HTMLElement` interface. Keeping
`<acronym>` buys no meaning. It costs a validation error on every page it appears on, and it
keeps an element MDN describes as "a candidate for removal from web standards or browsers".
Default styling has varied too: MDN notes that "a few browsers not only add a dotted underline,
but also put it in small caps".

A stylesheet can still depend on it. A rule such as `acronym { border-bottom: 1px dotted; }` or
a script that queries `acronym` stops matching after the switch, so the move needs a search of
the CSS and scripts as well as the markup.

## Use instead

Rename the element, and keep the `title`:

```html
<!-- Before -->
<acronym title="World Wide Web">WWW</acronym>

<!-- After -->
<abbr title="World Wide Web">WWW</abbr>
```

Because browsers already treat the two identically, swapping the tag name changes nothing a
reader sees or hears. Update any `acronym` selectors in CSS and scripts to `abbr` in the same
change.

Where the expansion matters, write it out in the text on first use as well: "the World Wide Web
(<abbr>WWW</abbr>)". MDN's accessibility notes recommend it, and a `title` is hard to reach from
a touchscreen or keyboard.

## Detectability

Fully detectable by tag name. The rule matches the tag outright. The CLI, the bookmarklet and
the ESLint plugin report the same findings, and none skips. There is no autofix, even though
replacing `acronym` with `abbr` would be safe here. Fixes only ever remove markup, and renaming
an element is not a removal.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `acronym` is entirely obsolete: "Use abbr instead."
- [HTML Standard: Other elements, attributes and APIs](https://html.spec.whatwg.org/multipage/obsolete.html#other-elements,-attributes-and-apis): user agents must treat `acronym` as equivalent to `abbr` in semantics and rendering.
- [HTML 4.01: phrase elements](https://www.w3.org/TR/html401/struct/text.html#h-9.2.1): `ABBR` "Indicates an abbreviated form" and `ACRONYM` "Indicates an acronym", side by side.
- [MDN: `<acronym>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/acronym): deprecated, a candidate for removal; use `<abbr>`; the small-caps note.
- [MDN: `<abbr>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/abbr): spelling the term out in full on first use; browser-compat-data lists Internet Explorer support from version 7.
