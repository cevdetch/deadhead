import type {
  Detectability,
  FixOp,
  Impact,
  Kind,
  Scope,
  Severity,
  StandardsBasis,
  Status,
  Tag,
} from "../../packages/core/vocabulary.ts";

/**
 * Display strings for the closed vocabularies in `packages/core`.
 *
 * These live here, not in core, on purpose: core is loaded by the bookmarklet
 * and must stay free of anything only a web page needs. The enum *values* are
 * shared; the prose describing them is presentation.
 *
 * Each map is keyed by the union type, so adding a value to a vocabulary in
 * core turns into a type error here rather than an unlabelled badge.
 */

export const statusLabels: Record<Status, string> = {
  avoid: "Avoid",
  recommended: "Recommended",
  situational: "Situational",
};

export const severityLabels: Record<Severity, string> = {
  harmful: "Harmful",
  deprecated: "Deprecated",
  unnecessary: "Unnecessary",
};

export const severityBlurbs: Record<Severity, string> = {
  harmful: "Actively breaks something for users.",
  deprecated: "Formally obsolete, but inert.",
  unnecessary: "Works, but is dead weight.",
};

export const basisLabels: Record<StandardsBasis, string> = {
  spec: "Specified",
  "spec-obsolete": "Obsoleted by the spec",
  "browser-convention": "Browser convention",
  vendor: "Vendor documentation",
  community: "Community convention",
};

export const basisBlurbs: Record<StandardsBasis, string> = {
  spec: "The evidence is in a current standard.",
  "spec-obsolete": "A standard defined it, then removed it.",
  "browser-convention": "Every engine agrees, but nothing normative says so.",
  vendor: "One vendor's documentation is the source.",
  community: "Convention only. The evidence is thin, and says so.",
};

export const detectLabels: Record<Detectability, string> = {
  yes: "Yes",
  partial: "Partial",
  no: "No",
};

export const detectBlurbs: Record<Detectability, string> = {
  yes: "Matched exactly. Autofixable when the rule carries a fix.",
  partial: "Reported as possible, and never autofixed.",
  no: "Needs human review.",
};

export const kindLabels: Record<Kind, string> = {
  element: "Element",
  document: "Document",
};

export const scopeLabels: Record<Scope, string> = {
  head: "inside <head>",
  body: "inside <body>",
  any: "anywhere in the document",
};

export const fixLabels: Record<FixOp, string> = {
  "remove-element": "Removes the element",
  "remove-attribute": "Removes the attribute",
  "remove-attributes": "Removes the attributes",
  "remove-token": "Removes the keyword",
  "remove-tokens": "Removes the dead keywords",
  none: "None — reports only",
};

export const impactLabels: Record<Impact, string> = {
  performance: "Performance",
  interop: "Interoperability",
  a11y: "Accessibility",
  seo: "SEO",
  security: "Security",
  maintainability: "Maintainability",
};

/** Order rule listings by how bad the thing is, worst first. */
export const severityOrder: Record<Severity, number> = {
  harmful: 0,
  deprecated: 1,
  unnecessary: 2,
};

export const namespaceBlurbs: Record<string, string> = {
  attr: "Attributes that outlived what they configured.",
  document: "The document element and what the whole page declares about itself.",
  element: "Elements the HTML Standard lists as obsolete, or that never became standard.",
  head: "The shape of the head itself — order, position, what must come first.",
  link: "<link> relations that no longer have a reader.",
  meta: "<meta> names and pragmas.",
  script: "What <script> blocks contain: JSON-LD data and its encoding.",
};

export const tagLabels: Record<Tag, string> = {
  apple: "Apple",
  caching: "Caching",
  charset: "Character encoding",
  cors: "CORS",
  csp: "Content Security Policy",
  defaults: "Default values",
  doctype: "Doctype",
  embedding: "Embedded content",
  forms: "Forms",
  "http-equiv": "http-equiv pragmas",
  hyperlinks: "Hyperlinks",
  i18n: "Language",
  icons: "Icons",
  media: "Media",
  microsoft: "Microsoft",
  mobile: "Mobile",
  mozilla: "Mozilla",
  "one-per-page": "One per page",
  presentational: "Presentational markup",
  "resource-hints": "Resource hints",
  scripting: "Scripting",
  search: "Search",
  social: "Social previews",
  "structured-data": "Structured data",
  svg: "SVG",
  tables: "Tables",
  text: "Text and lists",
  theming: "Theming",
  "web-app": "Web apps",
  "web-components": "Web Components",
};

export const tagBlurbs: Record<Tag, string> = {
  apple: "Apple-only names that the web app manifest or a standard icon now covers.",
  caching: "Caching instructions in markup: pragmas HTTP caches ignore, and the removed AppCache.",
  charset: "Character-encoding declarations: where they sit, how many, and which.",
  cors: "Fetches that need CORS mode: preloads that download twice and integrity checks that block without it.",
  csp: "Content Security Policy delivered through <meta>, and the directives it loses there.",
  defaults: "Attributes and pragmas that restate what the browser already assumes.",
  doctype: "Document-type declarations, the quirks mode a missing or legacy one triggers, and HTML version stamps.",
  embedding: "Plugins, frames and embeds that <iframe> and <video> outlived.",
  forms: "Form controls and form attributes the standard dropped.",
  "http-equiv": "HTTP headers written as <meta http-equiv>, where most of them do nothing.",
  hyperlinks: "Attributes on a, area and link that no longer shape a link.",
  i18n: "Language declarations, for people and for assistive technology.",
  icons: "Icon links that one favicon and a manifest replace.",
  media: "Images, image maps, sound and SVG references in their pre-HTML5 spellings.",
  microsoft: "Internet Explorer, Windows and Live Writer hooks: data binding, script events, document modes and tiles.",
  mobile: "Small-screen hints from before the viewport meta, and viewport settings that hurt.",
  mozilla: "Firefox features that were removed: Microsummary bookmark titles and sidebar links.",
  "one-per-page": "Declarations a page gets one of: base, canonical, charset, main, title.",
  presentational: "Styling written as HTML attributes and elements, such as align, bgcolor and <font>, which CSS replaced.",
  "resource-hints": "Preload, prefetch and prerender hints: the dead ones and the malformed ones.",
  scripting: "Script attributes, menus and data binding that browsers dropped.",
  search: "What crawlers read, and what they stopped reading long ago.",
  social: "Open Graph and card tags for link previews, and the mistakes that break a shared card.",
  "structured-data": "Machine-readable metadata: JSON-LD, Dublin Core and profiles.",
  svg: "Inline SVG attributes that SVG 2 removed or deprecated.",
  tables: "Table attributes that CSS and scope/headers replaced.",
  text: "Text, list and preformatted elements with a semantic or CSS replacement.",
  theming: "Colors a page hands the browser for its own interface and defaults: theme-color and color-scheme.",
  "web-app": "Install and home-screen metadata that the web app manifest replaced.",
  "web-components": "The first, abandoned Web Components drafts: <content>, <shadow> and HTML Imports.",
};

export const impactBlurbs: Record<Impact, string> = {
  performance: "Costs bytes, requests or render time: preloads fetched twice, and hints that start wasted work.",
  interop: "Browsers disagree on it, or none act on it: removed elements, vendor drafts and quirks-mode triggers.",
  a11y: "Gets in the way of assistive technology, or of the reader.",
  seo: "Changes what search engines index or show: canonicals, titles, robots directives and structured data.",
  security: "Weakens a protection, or only looks like one, such as a CSP directive browsers dropped or a late charset.",
  maintainability: "Dead weight a reader has to understand before deleting.",
};
