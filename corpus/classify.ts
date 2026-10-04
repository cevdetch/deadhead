import type { ErrorKind, Outcome } from "./types.ts";

/** Markers of challenge and interstitial pages, searched in the first 20 kB. */
const CHALLENGE =
  /cf-chl|challenge-platform|just a moment|captcha|_incapsula_|access denied|px-captcha|enable javascript and cookies/i;

/** A challenge or stub page standing in for the home page. */
export function isBlocked(bytes: number, head: string): boolean {
  if (bytes < 10_000) return true;
  return bytes < 60_000 && CHALLENGE.test(head.slice(0, 20_000));
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
  if (f.error !== null || f.status === null || f.status >= 400) return "failed";
  if (!(f.contentType ?? "").toLowerCase().includes("html")) return "failed";
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
