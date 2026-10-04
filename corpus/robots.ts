/** The product token the crawler announces and robots.txt can address. */
export const TOKEN = "deadhead-research";

/** Patterns that cover the root path. */
const ROOT = new Set(["/", "/*", "/$"]);

type Group = { agents: string[]; allowRoot: boolean; disallowRoot: boolean };

/**
 * Whether robots.txt forbids "/" to `token` (RFC 9309). Groups naming the
 * token win over "*"; groups for one agent combine; an Allow as long as the
 * Disallow wins. Only the root matters: the crawl fetches nothing else.
 */
export function disallowsRoot(text: string, token: string = TOKEN): boolean {
  const groups: Group[] = [];
  let current: Group | null = null;
  let inRules = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (match === null) continue;
    const key = (match[1] ?? "").toLowerCase();
    const value = (match[2] ?? "").trim();
    if (key === "user-agent") {
      if (current === null || inRules) {
        current = { agents: [], allowRoot: false, disallowRoot: false };
        groups.push(current);
        inRules = false;
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current !== null) {
      inRules = true;
      if (!ROOT.has(value)) continue;
      if (key === "allow") current.allowRoot = true;
      else current.disallowRoot = true;
    }
  }
  const named = groups.filter((g) => g.agents.includes(token.toLowerCase()));
  const chosen = named.length > 0 ? named : groups.filter((g) => g.agents.includes("*"));
  return chosen.some((g) => g.disallowRoot) && !chosen.some((g) => g.allowRoot);
}
