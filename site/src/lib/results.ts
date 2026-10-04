import type { Results } from "./figures.ts";

/**
 * The corpus results files, read at bundle time (`import.meta.glob`), where a
 * path from `import.meta.url` would point into dist. Raw text for `/data/`,
 * parsed objects for figures.
 */
const files = import.meta.glob<string>("../../../corpus/results/*.json", { query: "?raw", import: "default", eager: true });
const byName = new Map(Object.entries(files).map(([path, text]) => [path.split("/").at(-1)!, text]));

/** The raw JSON of `corpus/results/<name>`; throws when it does not exist. */
export function resultsText(name: string): string {
  const text = byName.get(name);
  if (text === undefined) throw new Error(`results: corpus/results/${name} does not exist`);
  return text;
}

const parsed = new Map<string, Results>();

/** `corpus/results/<name>`, parsed once. */
export function loadResults(name: string): Results {
  let results = parsed.get(name);
  if (results === undefined) {
    results = JSON.parse(resultsText(name)) as Results;
    parsed.set(name, results);
  }
  return results;
}
