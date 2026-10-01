/** One package as `npm pack --json` describes it: the parts the release scripts read. */
export type PackEntry = { filename: string; files: { path: string }[] };

/**
 * The packages in `npm pack --json` output. npm 11 (Node 24) prints an array;
 * npm 12 (Node 26) prints an object keyed by package name. The entries match.
 */
export function packEntries(json: string): PackEntry[] {
  const parsed: unknown = JSON.parse(json);
  const list = Array.isArray(parsed) ? parsed : Object.values(parsed as Record<string, unknown>);
  return list as PackEntry[];
}
