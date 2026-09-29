// The sources a rule cites, for JSON-LD `citation`. `validate:rules` requires
// at least two entries under `## Resources`, the last prose heading.

/**
 * Every http(s) link target under `## Resources`, in document order. A target
 * may hold one level of balanced parentheses, as archived Microsoft docs do
 * (`cc304073(v=vs.85)`).
 */
export function resourceUrls(body: string): string[] {
  const start = body.search(/^## Resources[ \t]*$/m);
  if (start === -1) return [];
  const rest = body.slice(start);
  const next = rest.slice(1).search(/^## /m);
  const section = next === -1 ? rest : rest.slice(0, next + 1);
  return [...section.matchAll(/\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))+)\)/g)].map((m) => m[1]!);
}
