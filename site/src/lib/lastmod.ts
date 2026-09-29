// When a rule last changed, for sitemap `lastmod`, `article:modified_time`
// and JSON-LD `dateModified`. Google uses `lastmod` when it is consistently
// accurate, so a shallow clone, where every file shares the one fetched
// commit, returns nothing and callers fall back to `pubDate`.
import { execFileSync } from "node:child_process";

/** Parses `git log --format=%x00%cs --name-only`: the first date seen per path is its newest commit. */
export function newestCommitDates(log: string): Map<string, string> {
  const out = new Map<string, string>();
  let date = "";
  for (const line of log.split("\n")) {
    if (line.startsWith("\u0000")) {
      date = line.slice(1);
      continue;
    }
    const path = line.trim();
    if (path !== "" && date !== "" && !out.has(path)) out.set(path, date);
  }
  return out;
}

/** ruleId → newest commit date of `content/rules/<ruleId>.md`; empty without git or on a shallow clone. */
export function ruleCommitDates(cwd: string): Map<string, string> {
  const git = (args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    if (git(["rev-parse", "--is-shallow-repository"]).trim() !== "false") return new Map();
    const byPath = newestCommitDates(git(["log", "--format=%x00%cs", "--name-only", "--", ":(top)content/rules"]));
    const out = new Map<string, string>();
    for (const [path, date] of byPath) {
      const match = /^content\/rules\/(.+)\.md$/.exec(path);
      if (match?.[1] !== undefined) out.set(match[1], date);
    }
    return out;
  } catch {
    return new Map();
  }
}

/** The later of the rule's `pubDate` and its newest commit, both `YYYY-MM-DD`. */
export const modifiedDate = (pubDate: string, committed: string | undefined): string =>
  committed !== undefined && committed > pubDate ? committed : pubDate;
