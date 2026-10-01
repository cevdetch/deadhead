/**
 * `http-equiv` value sets shared between logic modules, so a keyword lives
 * in exactly one list and cannot drift between the rule that decides on it
 * and `OWNED_HTTP_EQUIV`, the set `meta/http-equiv-unregistered-pragmas`
 * excludes.
 */

/** meta/http-equiv-cache-pragmas: HTTP caching fields with no pragma-table entry. */
export const CACHE_KEYWORDS: ReadonlySet<string> = new Set([
  "cache-control",
  "pragma",
  "expires",
  "etag",
  "last-modified",
]);

/** meta/http-equiv-client-hints: Chromium-only client-hint opt-ins. */
export const CLIENT_HINT_PRAGMAS: ReadonlySet<string> = new Set(["accept-ch", "delegate-ch"]);

/** meta/http-equiv-header-only-pragmas: response-header-only mechanisms. */
export const HEADER_ONLY: ReadonlySet<string> = new Set([
  "x-frame-options",
  "strict-transport-security",
  "content-security-policy-report-only",
  "x-content-type-options",
  "permissions-policy",
  "access-control-allow-origin",
  "referrer-policy",
  "feature-policy",
]);

/** meta/http-equiv-ie-pragmas: Internet Explorer-only pragma values. */
export const IE_ONLY: ReadonlySet<string> = new Set([
  "imagetoolbar",
  "msthemecompatible",
  "page-enter",
  "page-exit",
  "site-enter",
  "site-exit",
]);

/** meta/http-equiv-metadata-names: metadata names wearing a pragma's clothes. */
export const MISUSED_NAMES: ReadonlySet<string> = new Set([
  // Standard metadata names — belong in `<meta name>`.
  "author",
  "generator",
  "keywords",
  "theme-color",
  // Registered name extensions — belong in `<meta name>`.
  "audience",
  "apple-mobile-web-app-capable",
  "format-detection",
  "revisit-after",
  // Charset territory — belongs in `<meta charset>`.
  "charset",
  "encoding",
  // Language territory — belongs in `<html lang>`.
  "lang",
  "language",
  // No home anywhere — delete.
  "classification",
  "copyright",
  "distribution",
  "resource-type",
  "title",
]);

/** meta/http-equiv-x-security-pragmas: retired security mechanisms. */
export const RETIRED_SECURITY: ReadonlySet<string> = new Set([
  "x-xss-protection",
  "x-webkit-csp",
  "x-content-security-policy",
]);

/**
 * Values a rule owns by selector, `meta[http-equiv="<value>" i]`, rather
 * than by a logic module's list. Not exported: nothing needs the group on
 * its own, only folded into `OWNED_HTTP_EQUIV` below.
 */
const SELECTOR_OWNED: ReadonlySet<string> = new Set([
  // meta/csp-block-all-mixed-content, -navigate-to, -plugin-types,
  // -prefetch-src, -referrer, -reflected-xss, -report-uri and
  // meta/http-equiv-content-security-policy.
  "content-security-policy",
  "content-language", // meta/http-equiv-content-language
  "content-script-type", // meta/http-equiv-content-script-style-type
  "content-style-type", // meta/http-equiv-content-script-style-type
  "content-type", // meta/http-equiv-content-type
  "default-style", // meta/http-equiv-default-style
  "description", // meta/http-equiv-description
  "origin-trial", // meta/http-equiv-origin-trial
  "pics-label", // meta/http-equiv-pics-p3p
  "p3p", // meta/http-equiv-pics-p3p
  "refresh", // meta/http-equiv-refresh
  "robots", // meta/http-equiv-robots
  "x-robots-tag", // meta/http-equiv-robots
  "set-cookie", // meta/http-equiv-set-cookie
  "x-dns-prefetch-control", // meta/http-equiv-x-dns-prefetch-control
  "x-ua-compatible", // meta/http-equiv-x-ua-compatible
]);

/**
 * Every `http-equiv` value another rule reports, lowercased: the union of
 * every list above plus the selector-owned values.
 * `meta/http-equiv-unregistered-pragmas` reports a value only when it is
 * neither one of the WHATWG pragma-table keywords nor in this set.
 */
export const OWNED_HTTP_EQUIV: ReadonlySet<string> = new Set([
  ...CACHE_KEYWORDS,
  ...CLIENT_HINT_PRAGMAS,
  ...HEADER_ONLY,
  ...IE_ONLY,
  ...MISUSED_NAMES,
  ...RETIRED_SECURITY,
  ...SELECTOR_OWNED,
]);
