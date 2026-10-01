/**
 * The closed vocabularies a rule is written against, and the metadata shape
 * they add up to.
 *
 * This lives in core rather than in the build scripts because both sides need
 * it and they must not drift: `scripts/schema.ts` validates markdown against
 * these lists, and the engine dispatches on the values that survive. One list,
 * two readers.
 */

export const STATUS = ["avoid", "recommended", "situational"] as const;
export const SEVERITY = ["harmful", "deprecated", "unnecessary"] as const;
export const STANDARDS_BASIS = [
  "spec",
  "spec-obsolete",
  "browser-convention",
  "vendor",
  "community",
] as const;
export const DETECTABILITY = ["yes", "partial", "no"] as const;
export const KIND = ["element", "document"] as const;
export const SCOPE = ["head", "body", "any"] as const;
export const FIX_OP = [
  "remove-element",
  "remove-attribute",
  "remove-attributes",
  "remove-token",
  "remove-tokens",
  "none",
] as const;
export const IMPACTS = [
  "performance",
  "interop",
  "a11y",
  "seo",
  "security",
  "maintainability",
] as const;

/**
 * Tags are topics: the feature area or platform a rule is about. They exist
 * for browsing the rule index, never for driving behaviour, and they must say
 * something no other field says. Namespace, scope and impact names are
 * therefore not tags. A tag that applies to one rule alone is a title, not a
 * tag: `validate:rules` fails on it. Kept alphabetical; a rule lists its tags
 * in the same order.
 */
export const TAGS = [
  "apple",
  "caching",
  "charset",
  "cors",
  "csp",
  "defaults",
  "doctype",
  "embedding",
  "forms",
  "http-equiv",
  "hyperlinks",
  "i18n",
  "icons",
  "media",
  "microsoft",
  "mobile",
  "mozilla",
  "one-per-page",
  "presentational",
  "resource-hints",
  "scripting",
  "search",
  "social",
  "structured-data",
  "svg",
  "tables",
  "text",
  "theming",
  "web-app",
  "web-components",
] as const;

/** `namespace/name`, kebab-case. Shared by validate-rules and the docs site. */
export const RULE_ID: RegExp = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export type Status = (typeof STATUS)[number];
export type Severity = (typeof SEVERITY)[number];
export type StandardsBasis = (typeof STANDARDS_BASIS)[number];
export type Detectability = (typeof DETECTABILITY)[number];
export type Kind = (typeof KIND)[number];
export type Scope = (typeof SCOPE)[number];
export type FixOp = (typeof FIX_OP)[number];
export type Impact = (typeof IMPACTS)[number];
export type Tag = (typeof TAGS)[number];

/**
 * How bad is bad. `--fail-on` compares against this: a threshold of
 * `deprecated` also fails on `harmful`, because harmful is worse.
 */
export const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  harmful: 3,
  deprecated: 2,
  unnecessary: 1,
};

/**
 * One rule's metadata, exactly as it appears in `rules.json`. Optional
 * frontmatter fields are widened to `null`/`[]` by the build so consumers
 * never branch on key presence.
 */
export type RuleMeta = {
  ruleId: string;
  title: string;
  description: string;
  pubDate: string;
  status: Status;
  severity: Severity;
  standardsBasis: StandardsBasis;
  detectability: Detectability;
  kind: Kind;
  scope: Scope;
  selector: string | null;
  match: "logic" | null;
  /**
   * `attr` names the attribute a `remove-attribute`, `remove-token` or
   * `remove-tokens` fix acts on (`remove-tokens` reads its keywords from the
   * selector), and `token` the whitespace-separated keyword `remove-token`
   * deletes from it. Both are `null` for the ops that do not take them.
   * Without them the op is not actionable: knowing a rule removes *an*
   * attribute says nothing about which one. `remove-attributes` takes none:
   * it reads bare `[attr]` tests from the selector.
   */
  fix: { op: FixOp; attr: string | null; token: string | null };
  replacement: string;
  tags: Tag[];
  impacts: Impact[];
  related: string[];
};

/**
 * Where the rules are published. Defined once, here, because it is a contract
 * rather than a preference: the url is printed into CI logs, SARIF uploads and
 * ESLint metadata, and every one of those outlives the run that produced it.
 * The site in `site/` builds `/rules/<ruleId>` to match.
 */
export const SITE_URL = "https://deadhead.cevdet.ch";

/** Where a finding's explanation lives. */
export const ruleUrl = (ruleId: string): string => `${SITE_URL}/rules/${ruleId}`;
