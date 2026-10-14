# Changelog

Both packages, `deadhead` and `eslint-plugin-deadhead`, share one version.
Adding or renaming a rule is a minor release; prose-only and fix-only changes
are patches. Rule ids are permanent from 0.1.0: a rename leaves a redirect and
is marked as breaking.

## 0.3.1 - 2026-10-14

Fix CLI input handling, suppression comments and byte preservation, and reduce
repeated work in the CLI, browser playground and Vite integration. Both packages
move to 0.3.1 together; the catalogue remains at 203 rules.

### CLI

- Reject unsupported stdin options and invalid worker counts. Settle workers
  that exit without a report and clean up siblings on failure
  ([#505](https://github.com/cevdetta/deadhead/pull/505)).
- Validate baseline options and files before `--fix` changes HTML. Reject
  malformed baseline entries and counts outside the safe integer range.
- Keep JSON and SARIF parseable with fixes and baseline notices by sending
  those notices to stderr. Wait for stdout writes, including rule listings,
  before exiting. Reject inherited object names as report formats.
- Prune ignored directories before traversing them, deduplicate equivalent
  input paths, and cap worker counts at available CPUs and selected files.
- Report large finding lists without exceeding JavaScript's argument limit.
- Clarify first-run help and installation examples
  ([#505](https://github.com/cevdetta/deadhead/pull/505)).

### Findings and fixes

- Read suppression directives from actual parsed HTML comments. Comment-like
  strings in scripts, styles, RCDATA and attributes cannot suppress findings.
  Unknown-rule warnings use line numbers from the source after fixes.
- Preserve surviving whitespace and quote style in keyword fixes. Remove a
  standalone element's full CRLF line. Decline quoted encoded token values
  where a source edit cannot preserve their decoded meaning.
- Build bounded finding previews and reuse them across rules reporting the
  same element, preserving the existing text and 90-character limit.
- Align ESLint text with HTML comment, RCDATA and newline semantics. Preserve
  template parents and sibling indices in the live DOM adapter.

### Runtime reuse and browser

- Retain at most 128 compiled ESLint rule subsets with least-recently-used
  eviction; findings, fixes and one engine pass per file survive eviction.
- Reuse analysis for unchanged Vite HTML. Bound cached prepared reports to
  512 URL paths and 4 MiB of retained text, without retaining response bodies.
- Reuse the playground's original analysis in its fix loop, and the corpus
  runner's initial findings when measuring fixed HTML.
- Remove unused analysis/single-file/baseline helpers and internal exports.
  Simplify finding ordering and per-port child caches, and generate both
  registries in one pass without parsing the generated JSON again.
- Generate a browser registry with the same logic and engine metadata, omitting
  documentation fields that the playground never reads.
- Include backtick dynamic imports when measuring the playground's JavaScript
  payload; the size check previously omitted its generated registry chunk.
- Bound decoded link data to 10 MiB and encoded handoffs to one million
  characters. Cancel oversized decompression; local file input has no link limit.
- Report clipboard, file-read and malformed-link failures in the playground.
  Clear incoming page fragments before decoding them.
- Add worker-count benchmark options, reject failed cold-start measurements,
  and clean up synthetic benchmark files.

## 0.3.0 - 2026-10-13

The new `deadhead/vite` export adds dev-time checking to Vite 8 projects. Both
published packages move to 0.3.0 together. The rule set is unchanged: 203 rules,
with the same findings and autofixes as 0.2.1.

### Vite integration

- Add `deadhead()` from `deadhead/vite` to your Vite config to report findings,
  advice and rule links in the terminal and DevTools console during development
  ([#502](https://github.com/cevdetta/deadhead/pull/502)).
- Checks use the CLI parser and inspect completed HTML responses, including SSR
  streams served through Vite's middleware stack. Positions refer to the served
  HTML. Frameworks with a separate HTML server need the CLI or bookmarklet.
- Read rule settings and URL filters from `deadhead.config.ts` in Vite's root,
  with plugin options overriding the file. Set `console: false` for terminal
  reports with unchanged response bytes and headers.
- The plugin checks UTF-8 HTML up to 2 MiB, preserves streamed writes and
  backpressure, and skips compressed or partial responses. It respects
  `Cache-Control: no-transform` and uses Vite's configured CSP nonce for console
  output. A blocked console script leaves the terminal report available.
- Vite is an optional peer; CLI users do not install it. The plugin ships
  JavaScript and TypeScript declarations. Builds keep using
  `"postbuild": "deadhead dist"` after the framework writes its final output.

### Bookmarklet

- The full report button re-reads the page's HTML in your browser and opens it on
  `/try`, with positions, advice and fixed HTML. If CSP blocks the re-read, it
  sends the rendered DOM. The HTML travels in the URL fragment; `/try` clears it
  after reading it ([#501](https://github.com/cevdetta/deadhead/pull/501)).

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
