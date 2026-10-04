# Changelog

Both packages, `deadhead` and `eslint-plugin-deadhead`, share one version.
Adding or renaming a rule is a minor release; prose-only and fix-only changes
are patches. Rule ids are permanent from 0.1.0: a rename leaves a redirect and
is marked as breaking.

## 0.2.1 - 2026-10-05

Fixes from the first corpus run. Deadhead 0.2.0 linted the home pages of the Tranco top
10,000, and a review of 20 findings per rule found autofixes that changed what a page does,
false positives, and doc claims their sources contradict. No new rules; 203 in all.

### Changes that alter fixes

- A `<meta>` carrying more than one of `name`, `property`, `http-equiv`, `itemprop` and
  `charset` is still reported but never deleted whole: the fix would take a live key with
  the dead one ([#488](https://github.com/cevdetta/deadhead/pull/488)).
- `link/href-missing` keeps a link with an `id` or a `data-*` attribute, a hook a script
  fills ([#488](https://github.com/cevdetta/deadhead/pull/488)).
- `attr/input-number-maxlength-size` fixes only where `maxlength` is absent: scripts read it
  through `maxLength` ([#488](https://github.com/cevdetta/deadhead/pull/488)).
- `link/canonical-qualifiers` has no autofix: stripping the qualifier makes Google use the
  canonical ([#488](https://github.com/cevdetta/deadhead/pull/488)).
- `meta/http-equiv-x-dns-prefetch-control` fixes what it reports: no engine acts on `on` or
  an empty value ([#492](https://github.com/cevdetta/deadhead/pull/492)).
- `meta/apple-mobile-web-app-status-bar-style` fixes every value it reports ([#490](https://github.com/cevdetta/deadhead/pull/490)).

### Changes that alter findings

- `meta/viewport-value` accepts WebKit's `shrink-to-fit` and numeric `user-scalable`; on
  the top 10,000 it falls from 10.9% of sites to 1.1% ([#490](https://github.com/cevdetta/deadhead/pull/490)).
- `meta/apple-mobile-web-app-status-bar-style` leaves `black` and `black-translucent`
  alone: since iOS 26 every Home Screen site opens as a web app ([#490](https://github.com/cevdetta/deadhead/pull/490)).
- `meta/referrer-value` accepts `origin-when-crossorigin`, a legacy keyword in HTML's
  table ([#490](https://github.com/cevdetta/deadhead/pull/490)).
- `attr/script-async` and `attr/script-defer` leave an empty script with no `src`, a
  placeholder HTML prepares again once `src` arrives ([#488](https://github.com/cevdetta/deadhead/pull/488)).
- `attr/a-coords-shape` reports `shape` only with an image-map value ([#488](https://github.com/cevdetta/deadhead/pull/488)).
- `meta/http-equiv-x-dns-prefetch-control` reports `on`, an empty value and a missing
  `content`; any other value is an opt-out in Firefox ([#492](https://github.com/cevdetta/deadhead/pull/492)).
- `head/viewport-missing` leaves a desktop page that names its separate mobile URL with
  `<link rel="alternate" media>` ([#492](https://github.com/cevdetta/deadhead/pull/492)).
- `script/json-ld-unescaped-lt` reports a literal `</`, not any `<` ([#494](https://github.com/cevdetta/deadhead/pull/494)).
- Narrowed to what each rule claims ([#490](https://github.com/cevdetta/deadhead/pull/490), [#492](https://github.com/cevdetta/deadhead/pull/492)): `attr/fetchpriority-value`
  (empty value), `head/base-position` (no `href`), `document/main-multiple` (under a
  `hidden` ancestor or a closed dialog), `script/json-ld-syntax` (empty block),
  `link/preload-as-missing` (`preload stylesheet`), `link/preload-font-crossorigin-missing`
  (stylesheet URLs), `meta/og-name-attribute` (with `property`),
  `meta/http-equiv-unregistered-pragmas` (`onion-location`, `x-pjax-version`),
  `attr/list-presentational` (`ol[type]`), `link/canonical-relative` and
  `link/hreflang-relative` (URLs trimmed as the URL parser trims them; any scheme is
  absolute), `head/metadata-position` (template contents), `meta/charset-value` (empty
  value) and `meta/title` (Swiftype's tags).

### ESLint plugin

- Decodes character references in attribute values and text, as the CLI and the
  bookmarklet do: `type="text&#x2F;javascript"` now reports in ESLint too ([#486](https://github.com/cevdetta/deadhead/pull/486)).

### Rule text

- Corrected against primary sources: `attr/iframe-presentational`, `attr/style-type`,
  `document/doctype`, `meta/charset-value`, `meta/csp-block-all-mixed-content` and
  `link/apple-touch-icon-precomposed` ([#492](https://github.com/cevdetta/deadhead/pull/492)); the descriptions of
  `head/charset-multiple` and `head/base-multiple` ([#494](https://github.com/cevdetta/deadhead/pull/494)).

## 0.2.0 - 2026-10-01

13 new rules, 203 in all, and 12 revised ones. The first release published from CI
with npm provenance, staged and approved with 2FA.

### Changes that alter findings or fixes

- `meta/og-required-properties` reports a page with Open Graph tags and no `og:image`,
  and nothing else; severity drops from harmful to unnecessary
  ([#426](https://github.com/cevdetta/deadhead/pull/426)).
- `meta/twitter-card-names` keeps `twitter:card`, attribution and layout tags, and
  fixes the tags that repeat Open Graph or that nothing reads
  ([#423](https://github.com/cevdetta/deadhead/pull/423)).
- `meta/robots-value` accepts `noai` and `noimageai` outside Google's own names
  ([#428](https://github.com/cevdetta/deadhead/pull/428)).
- `meta/http-equiv-unregistered-pragmas` leaves `origin-trial` to the new
  `meta/http-equiv-origin-trial`, which reports a tag once its tokens expire
  ([#464](https://github.com/cevdetta/deadhead/pull/464)).
- `meta/msapplication-names` now fixes every name: Internet Explorer is gone
  ([#470](https://github.com/cevdetta/deadhead/pull/470)).
- `meta/apple-mobile-web-app-capable` fixes the tag when the page links a
  manifest and no startup image, and nowhere else ([#471](https://github.com/cevdetta/deadhead/pull/471)).
- The bookmarklet panel links to each rule's fix instead of printing it, which frees 11 kB
  of the `javascript:` URL under the 64 kB cap ([#458](https://github.com/cevdetta/deadhead/pull/458)).

### New rules

- `meta/tdm-reservation-value` ([#430](https://github.com/cevdetta/deadhead/pull/430))
- `attr/img-fetchpriority-loading` ([#444](https://github.com/cevdetta/deadhead/pull/444))
- `attr/fetchpriority-value` ([#446](https://github.com/cevdetta/deadhead/pull/446))
- `script/speculationrules-syntax` ([#448](https://github.com/cevdetta/deadhead/pull/448))
- `link/preload-fetch-crossorigin-missing` ([#450](https://github.com/cevdetta/deadhead/pull/450))
- `script/importmap-syntax` ([#452](https://github.com/cevdetta/deadhead/pull/452))
- `attr/importance` ([#455](https://github.com/cevdetta/deadhead/pull/455))
- `head/base-position` ([#457](https://github.com/cevdetta/deadhead/pull/457))
- `head/description-multiple` ([#460](https://github.com/cevdetta/deadhead/pull/460))
- `link/hreflang-relative` ([#462](https://github.com/cevdetta/deadhead/pull/462))
- `meta/http-equiv-origin-trial` ([#464](https://github.com/cevdetta/deadhead/pull/464))
- `link/modulepreload-as-value` ([#466](https://github.com/cevdetta/deadhead/pull/466))
- `head/metadata-position` ([#473](https://github.com/cevdetta/deadhead/pull/473))

### Rule text

- `element/fencedframe` milestones move to M156 and M157 ([#432](https://github.com/cevdetta/deadhead/pull/432))
- `attr/browsingtopics-attributionsrc` and `attr/iframe-allow-privacy-sandbox` state the removal stage ([#434](https://github.com/cevdetta/deadhead/pull/434))
- `meta/apple-mobile-web-app-capable` states the iOS 26 web app default ([#436](https://github.com/cevdetta/deadhead/pull/436))
- `meta/revisit-after` names `lastmod` as what Google and Bing read ([#438](https://github.com/cevdetta/deadhead/pull/438))
- `meta/og-relative-url` cites Meta's absolute-URL rule ([#440](https://github.com/cevdetta/deadhead/pull/440))
- `meta/http-equiv-x-dns-prefetch-control` cites whatwg/html#9473 ([#442](https://github.com/cevdetta/deadhead/pull/442))

## 0.1.0 - 2026-10-01

First release. ESM only, Node 24.8 or newer; the ESLint plugin needs ESLint 10.

- 190 rules across attr/, document/, element/, head/, link/, meta/ and
  script/. Every finding links to its page on https://deadhead.cevdet.ch.
- CLI: stylish, JSON and SARIF output; --fix; baselines; suppression comments;
  --jobs for large trees; stdin. Layout partials and components are linted
  for what they hold.
- ESLint plugin: one rule per deadhead rule, `recommended` and `all` configs,
  autofix where the rule has one.
- Types generated from the source for `defineConfig` and the plugin.
- Published by hand from the tested tarballs. Every later release comes from
  CI with npm provenance, staged and approved with 2FA.
