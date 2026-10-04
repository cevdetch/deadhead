import type { ErrorKind, Outcome } from "./types.ts";

/** Markers of challenge and interstitial pages, searched in the first 20 kB. */
const CHALLENGE =
  /cf-chl|challenge-platform|just a moment|captcha|_incapsula_|access denied|px-captcha|enable javascript and cookies|gorizontal-vertikal/i;

/**
 * Titles of challenge and block pages. These pages can run to hundreds of kB
 * of branded markup, so the title decides at any size.
 */
const CHALLENGE_TITLE =
  /<title[^>]*>\s*(just a moment|attention required|access denied|security check|security verification|verifying you are human|one more step|pardon our interruption|request rejected|bot verification)/i;

/** Statuses bot walls answer with: the page behind them may be fine. */
export const WALL_STATUS: ReadonlySet<number> = new Set([401, 403, 429]);

/** A challenge or stub page standing in for the home page. */
export function isBlocked(bytes: number, head: string): boolean {
  if (bytes < 10_000) return true;
  const start = head.slice(0, 20_000);
  if (CHALLENGE_TITLE.test(start)) return true;
  return bytes < 60_000 && CHALLENGE.test(start);
}

/** Chromium's network error page and certificate interstitial, as --dump-dom returns them. */
const BROWSER_ERROR = /<body (?:class="neterror"|id="body" class="ssl")/;

/** A not-found page: "404", "Page not found", "Error 404 - Site". Not "404 Media". */
const NOT_FOUND_TITLE = /<title[^>]*>\s*(?:error\s*)?(?:404|page not found|not found)(?:\s*(?:not found|error|page))?\s*(?:[|:·–-][^<]*)?<\/title>/i;

/** A rendered page that is an error, not the home page: Chromium's own, or the site's 404. */
export function isErrorPage(dom: string): boolean {
  return BROWSER_ERROR.test(dom) || NOT_FOUND_TITLE.test(dom.slice(0, 20_000));
}

/** What classification needs from a raw fetch. `head` is the start of the decoded body. */
export type RawFacts = {
  robots: "allowed" | "disallowed";
  error: ErrorKind | null;
  status: number | null;
  contentType: string | null;
  bytes: number;
  head: string;
};

/** The raw outcome; `duplicate` is decided later, across domains. */
export function classifyRaw(f: RawFacts): Exclude<Outcome, "duplicate"> {
  if (f.robots === "disallowed") return "skipped";
  if (f.error === "dns" || f.error === "connect" || f.error === "tls") return "no-site";
  if (f.error !== null || f.status === null) return "failed";
  if (!(f.contentType ?? "").toLowerCase().includes("html")) return "failed";
  if (f.status >= 400) return WALL_STATUS.has(f.status) || CHALLENGE.test(f.head.slice(0, 20_000)) ? "blocked" : "failed";
  return isBlocked(f.bytes, f.head) ? "blocked" : "linted";
}

/** Ranks whose final origin a better-ranked domain already reached. */
export function duplicateRanks(sites: { rank: number; finalOrigin: string | null }[]): Set<number> {
  const seen = new Set<string>();
  const duplicates = new Set<number>();
  for (const site of [...sites].sort((a, b) => a.rank - b.rank)) {
    if (site.finalOrigin === null) continue;
    if (seen.has(site.finalOrigin)) duplicates.add(site.rank);
    else seen.add(site.finalOrigin);
  }
  return duplicates;
}
