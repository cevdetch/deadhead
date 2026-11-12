---
ruleId: "meta/http-equiv-content-language"
title: "<meta http-equiv=\"content-language\">"
description: "http-equiv=content-language is non-conforming; declare the page language with the lang attribute instead. Add lang before deleting this tag."
pubDate: "2026-09-14"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="content-language" i]'
fix: { op: "none" }
replacement: "Declare the language with <html lang> (and lang on embedded foreign-language passages)."
tags: ["http-equiv", "i18n"]
impacts: ["a11y"]
related: ["document/html-lang"]
---

Never use `<meta http-equiv="content-language">` for the page language. It was the old way to
state a page's language in markup. The HTML Standard calls the pragma non-conforming: "Authors
are encouraged to use the lang attribute instead", while W3C internationalisation guidance says
never to use this meta form for the page language at all.

The pragma still does something. It sets what the standard calls the pragma-set default
language: the first token of `content`, used for any node that no `lang` attribute covers. A
value with a comma is ignored outright, and in `content="en de"` only `en` counts.

## Why avoid

The pragma is "almost, but not quite, entirely unlike the HTTP `Content-Language` header of the
same name", in the standard's own words. The header signals the intended *audience*, and can
list several languages; the pragma sets a *default language* that applies only where no `lang`
attribute does, and takes one. Authors routinely confuse the two, and the confusion runs both
directions.

`lang` does more, everywhere it matters: screen readers, text-to-speech and Braille devices pick
pronunciation from it; translation, hyphenation, spell-checking and font selection key off it.
The pragma only fills gaps where `lang` is absent, and in-page language always overrides header
information. There is no case where the pragma adds information `lang` cannot carry better, and
an element-level `lang` can mark a passage in another language, which a page-wide default
cannot.

A page that carries both can disagree with itself. With `<html lang="en">` and a pragma of `de`,
every node takes `en` from the root, and the pragma is dead text that misleads the next reader.
With no `lang`, the pragma decides, and a value copied from another site's template labels the
whole page in the wrong language.

Search engines are a separate audience. Bing's 2011 guidance on country and language named this
meta tag as one way to signal a page's language and region, ahead of `<html lang>` in priority,
and the `Content-Language` HTTP header as a site-wide way to do the same. Google states that it
does not use `hreflang` or the `lang` attribute to detect a page's language.

## Use instead

Declare the language on the root element, and on any passage in another language:

```html
<!-- Before: a page-wide default in a non-conforming pragma -->
<meta http-equiv="content-language" content="en">

<!-- After -->
<html lang="en">
```

```html
<p>The phrase <span lang="fr">c'est la vie</span> is French.</p>
```

Add `lang` first, check it matches the content, then delete the tag. A site that wants to keep a
language-and-region signal for Bing can send it as a `Content-Language` response header, which
carries the same information without the pragma. Language versions of a page for Google belong
in hreflang annotations: `link/hreflang-relative` and `link/hreflang-value` cover those.

## Detectability

Detectable with one selector: one element and one attribute value, matched without regard to
ASCII case, with no context that changes the verdict. The CLI, the bookmarklet and the ESLint
plugin report the same findings, and none skips. There is deliberately no autofix. The pragma
still sets the pragma-set default language wherever no `lang` applies, so deleting the tag
before adding `lang` changes the document's computed language. Add `lang` first, then delete
this tag by hand.

## Resources

- [HTML Standard: Pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives): content-language is non-conforming, use lang instead; it sets the pragma-set default language from the first token, ignores a value with a comma, and is "almost, but not quite, entirely unlike" the HTTP header.
- [HTML Standard: the `lang` attribute](https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes): a node's language comes from the nearest `lang`, then the pragma-set default language, then HTTP.
- [W3C i18n: Declaring language in HTML](https://www.w3.org/International/questions/qa-html-language-declarations): never use this meta form for the page; always declare with lang on html.
- [MDN: `<meta http-equiv>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/http-equiv): content-language is a default for assistive tech and styling; use the lang attribute instead.
- [Bing Japan: How to tell Bing your website's country and language (2011)](https://blogs.bing.com/japan/2011/3/Web-%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%B5%E3%82%A4%E3%83%88%E3%81%AE%E5%9B%BD%E3%83%BB%E8%A8%80%E8%AA%9E%E3%82%92Bing%E3%81%AB%E4%BC%9D%E3%81%88%E3%82%8B%E6%96%B9%E6%B3%95/): the translated Bing guidance: the meta tag, then `<html lang>`, then `<title lang>` in priority, and the HTTP header for a whole site.
- [Google Search Central: localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions): "Google doesn't use `hreflang` or the HTML `lang` attribute to detect the language of a page".
