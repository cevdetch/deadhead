---
ruleId: "link/hreflang-value"
title: "<link rel=\"alternate\" hreflang> with an unsupported code"
description: "Search engines match hreflang to ISO 639-1 languages and ISO 3166-1 regions. A code outside them, like en-UK or us, targets no one."
pubDate: "2026-09-29"
status: "avoid"
severity: "harmful"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="alternate" i][hreflang]'
match: "logic"
fix: { op: "none" }
replacement: "Use an ISO 639-1 language with an optional ISO 3166-1 region: hreflang=\"en-GB\", not en-UK. Use x-default for the fallback page."
tags: ["i18n", "search"]
impacts: ["seo"]
related: ["link/canonical-qualifiers", "document/html-lang", "attr/area-hreflang-type-nohref"]
---

`<link rel="alternate" hreflang>` tells search engines which version of a page to show
searchers in each language and region. Google and Yandex read a closed set of codes there. A
code outside that set targets no one, and the page gives no sign of the failure.

## Why avoid

Google accepts a language from ISO 639-1, an optional script from ISO 15924 and an optional
region from ISO 3166-1 alpha-2, plus the reserved `x-default`. Its page states that other
codes "aren't supported", that "Specifying the region alone is not valid", and that `EU`,
`UN` or `UK` "doesn't have an effect on Google Search". Yandex asks for ISO 639-1 languages
and ISO 3166-1 alpha-2 regions. A British visitor behind `en-UK` gets whichever version
Google picks.

The failures follow habits. `en_US` comes from POSIX locale names. `en-UK` comes from the
domain name: ISO 3166-1 assigns `GB`, and RFC 5646 records `UK` as its "exact synonym"
outside the registry. `es-419` is valid BCP 47 for Latin American Spanish, and Google names
it as unsupported. A lone `us` names a country with no language.

HTML asks for any valid BCP 47 tag, so each of these conforms and a validator passes it. The
narrower set belongs to the search engines, the readers the annotation exists for.

Three codes pass as languages: `uk` is Ukrainian, `se` Northern Sami and `be` Belarusian. An
author who meant the United Kingdom, Sweden or Belgium passes this rule with a wrong target.

## Use instead

```html
<link rel="alternate" hreflang="en-GB" href="https://example.com/uk/">
<link rel="alternate" hreflang="es" href="https://example.com/es/">
<link rel="alternate" hreflang="zh-Hant" href="https://example.com/zh-tw/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
```

Use `GB` for the United Kingdom. Replace a region group such as `419` with a plain language
(`es`) or one link per country. Put the language first: `en-US`, not `us`.

## Detectability

Detectable with logic refining the selector. The CLI, the bookmarklet and the ESLint plugin
report the same findings; none skips. The selector prefilters to
`link[rel~="alternate" i][hreflang]`. The module in
`packages/rules/logic/link/hreflang-value.ts` strips ASCII whitespace from both ends and
folds the value to ASCII lowercase: Google calls the value "case-insensitive". It accepts
`x-default` and four shapes: `ll`, `ll-ssss`, `ll-rr` and `ll-ssss-rr`. `ll` is one of the
184 two-letter languages the IANA registry does not deprecate, `ssss` any four letters, and
`rr` one of the 249 assigned ISO 3166-1 codes. An empty value, `en_US`, `us`, `fil`, `iw`,
`en-UK`, `es-419`, `ca-ES-valencia` and `x-foo` all report.

The rule checks one link at a time. Return links and self-links need the other
pages of the set, so it leaves them alone. The autofix is `none`: the repair is a different
code, and deleting the link drops a locale from the set.

## Resources

- [Google Search Central: Tell Google about localized versions of your page](https://developers.google.com/search/docs/specialty/international/localized-versions): "Only language codes listed in ISO 639-1 and region codes listed in ISO 3166-1 Alpha 2 are supported; other codes that aren't listed in those standards, such as es-419, aren't supported", "Specifying the region alone is not valid", and "using EU, UN, or UK in hreflang annotations doesn't have an effect on Google Search".
- [Yandex Webmaster: Indexing localized pages](https://yandex.com/support/webmaster/en/yandex-indexing/locale-pages): "Select the language code from the ISO 639-1 list. Select the region code from the ISO 3166-1 Alpha-2 (worldwide) or ISO 3166-2:RU (Russian regions) list".
- [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry): the two-letter language and region subtags, with no `UK` record and `iw`, `in`, `ji`, `jw`, `mo` and `bh` deprecated.
- [RFC 5646, section 2.2.4](https://www.rfc-editor.org/rfc/rfc5646#section-2.2.4): the "exceptionally reserved" ISO 3166-1 codes entered the registry "with the exception of 'UK', which is an exact synonym for the assigned code 'GB'".
- [HTML Standard: the `hreflang` attribute](https://html.spec.whatwg.org/multipage/links.html#attr-hyperlink-hreflang): "The value must be a valid BCP 47 language tag."
