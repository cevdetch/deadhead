// Page titles for search results. A result shows about 60 characters of the
// <title> before truncating it, so the subject leads and the brand follows
// only when it fits. `scripts/site-budget.ts` holds every built page to 60.
import type { Severity, Status } from "../../../packages/core/vocabulary.ts";

export const SITE_NAME = "deadhead";

/** The person behind the site, for bylines, the feed and JSON-LD. */
export const AUTHOR = { name: "Cevdet", url: "https://cevdet.ch/" } as const;

/**
 * JSON-LD `author` and `publisher`: a reference to the Person that
 * cevdet.ch defines in full, so every site of the author's names one node.
 */
export const PERSON = {
  "@type": "Person",
  "@id": "https://cevdet.ch/#person",
  name: AUTHOR.name,
  url: AUTHOR.url,
  sameAs: ["https://github.com/cevdetch"],
} as const;
const MAX = 60;

/** The core title plus the brand when both fit in 60 characters; the core alone otherwise. Never truncated. */
export const pageTitle = (core: string): string => {
  const branded = `${core} - ${SITE_NAME}`;
  return branded.length <= MAX ? branded : core;
};

/** What a rule page answers, after the markup it is about: a verdict and the action. */
const VERDICT: Record<Severity, string> = {
  harmful: "harmful, fix it",
  deprecated: "deprecated, replace it",
  unnecessary: "unnecessary, remove it",
};

/** The rule title with its verdict when that fits in 60 characters; the bare title otherwise. */
export const ruleCoreTitle = (title: string, severity: Severity, status: Status): string => {
  const core = status === "situational" ? `${title}: when it still helps` : `${title}: ${VERDICT[severity]}`;
  return core.length <= MAX ? core : title;
};
