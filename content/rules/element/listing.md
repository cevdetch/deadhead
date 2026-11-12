---
ruleId: "element/listing"
title: "<listing>"
description: "listing is obsolete; it renders like `pre` but carries no code semantics, so use `pre` and `code` instead."
pubDate: "2026-09-14"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: 'listing'
fix: { op: "none" }
replacement: "Mark up code listings with `<pre><code>`."
tags: ["text"]
impacts: ["maintainability"]
related: ["element/xmp", "element/plaintext"]
---

`<listing>` is `<pre>` without the meaning. It is an early-HTML element for computer listings
that browsers render like `<pre>`: a block of monospace, preformatted text. The HTML Standard
lists it under non-conforming features with the direction "Use `pre` and `code` instead", and
W3C's HTML5 author guidance says the same.

HTML 2.0 already advised against it. RFC 1866, in 1995, declared the content of `<XMP>` and
`<LISTING>` as CDATA, so "no markup except the end-tag open delimiter-in-context is recognized",
and concluded that "HTML documents should not contain `<XMP>` nor `<LISTING>` elements -- the
`<PRE>` tag is more expressive and more consistently supported". It also asked that a listing be
rendered so "at least 132 characters fit on a line", the width of a line printer.

## Why avoid

It is entirely obsolete and must not be used by authors. Both the WHATWG HTML Standard and the
W3C HTML5 edition place `listing` on their obsolete-element lists with `pre` and `code` as the
replacement.

What is left in browsers is rendering without meaning. User agents "must treat listing elements
in a manner equivalent to pre elements in terms of semantics and for purposes of rendering", and
the DOM gives it the `HTMLPreElement` interface. So it looks like a code block without saying
the content is code. `<code>` does say that, and assistive technology exposes it through the
ARIA `code` role.

It also lost what made it different. In HTML 2.0 its content was literal text, as in `xmp`; the
HTML parser today parses `listing` content as markup, the way it parses `pre`, including
dropping a leading newline. An old listing that relied on the CDATA rule, with a raw `<` or `&`
in it, now has that text read as tags and character references. `xmp` keeps the raw-text
behaviour, and is obsolete for its own reasons. There is no case where `listing` does something
`pre` cannot do more clearly.

## Use instead

A preformatted code block, with markup escaped so it stays literal:

```html
<!-- Before: the <b> tags vanish and the word turns bold -->
<listing><b>hello</b></listing>

<!-- After: the tags show as written -->
<pre><code class="language-html">&lt;b&gt;hello&lt;/b&gt;</code></pre>
```

Escape `<` as `&lt;` and `&` as `&amp;` inside the block; `>` can stay as it is. A `class` on
the `code` element, such as `class="language-html"`, names the language, the convention the HTML
Standard suggests and syntax highlighters read. For output from a program, as opposed to source
code, `<samp>` inside `<pre>` marks it as sample output.

## Detectability

Detectable with the selector alone. The rule matches the bare element name `listing`; no logic
module is needed. The CLI, the bookmarklet and the ESLint plugin report the same findings, and
none skips.

There is no autofix. Removing the element deletes its content, and rewriting it as `pre` plus
`code` is a rename and not a subtraction, so the fix op is `none`.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `listing` is entirely obsolete; `pre` and `code` instead.
- [HTML Standard: Other elements, attributes and APIs](https://html.spec.whatwg.org/multipage/obsolete.html#other-elements,-attributes-and-apis): user agents must treat `listing` equivalent to `pre` in semantics and rendering.
- [HTML Standard: the "in body" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody): `pre` and `listing` start tags share one rule, which skips a leading newline; `xmp` uses the raw text algorithm.
- [RFC 1866: HTML 2.0, section 5.5.2.1](https://www.rfc-editor.org/rfc/rfc1866#section-5.5.2.1): `XMP` and `LISTING` content as CDATA, and "HTML documents should not contain `<XMP>` nor `<LISTING>` elements".
- [W3C HTML5: Edition for Web Authors: Obsolete features](https://www.w3.org/TR/2011/WD-html5-author-20110809/obsolete.html): independent W3C list with the same verdict and replacement.
- [HTML Standard: the `code` element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-code-element): a `class` prefixed with `language-` to name the language.
- [MDN: `<samp>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/samp): sample output from a computer program.
