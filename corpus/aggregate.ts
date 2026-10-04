import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";

import { loadRules } from "../packages/rules/load.ts";
import { duplicateRanks } from "./classify.ts";
import { wilson } from "./stats.ts";
import type { LintLine } from "./types.ts";

export type Band = { linted: number; sites: number; rate: number };
export type RuleStat = {
  raw: { sites: number; rate: number; ci: [number, number]; top1k: Band; rest: Band | null };
  rendered: { sites: number; rate: number };
};
export type Aggregate = {
  list: { source: "tranco"; id: string; created: string | null; n: number };
  deadhead: { version: string; commit: string };
  snapshot: { first: string | null; last: string | null };
  coverage: { raw: Record<string, number>; rendered: Record<string, number> };
  rules: Record<string, RuleStat>;
};
export type AggregateMeta = { listId: string; listCreated: string | null; n: number; version: string; commit: string };

const round = (x: number): number => Math.round(x * 1e4) / 1e4;

const bump = (counts: Record<string, number>, key: string): void => {
  counts[key] = (counts[key] ?? 0) + 1;
};

/** Per-rule rates over the linted, de-duplicated sites. Domain names stay out. */
export function aggregate(lines: LintLine[], ruleIds: string[], meta: AggregateMeta): Aggregate {
  const duplicates = duplicateRanks(
    lines.map((l) => ({ rank: l.rank, finalOrigin: l.raw.outcome === "linted" || l.raw.outcome === "blocked" ? l.finalOrigin : null })),
  );
  const coverage = { raw: {} as Record<string, number>, rendered: {} as Record<string, number> };
  const kept: LintLine[] = [];
  for (const line of lines) {
    const duplicate = duplicates.has(line.rank);
    bump(coverage.raw, duplicate ? "duplicate" : line.raw.outcome);
    bump(coverage.rendered, duplicate ? "duplicate" : line.rendered.outcome);
    if (!duplicate) kept.push(line);
  }
  const rawLinted = kept.filter((l) => l.raw.outcome === "linted");
  const renderedLinted = kept.filter((l) => l.rendered.outcome === "linted");
  const band = (subset: LintLine[], id: string): Band => {
    const sites = subset.filter((l) => (l.raw.counts?.[id] ?? 0) > 0).length;
    return { linted: subset.length, sites, rate: subset.length === 0 ? 0 : round(sites / subset.length) };
  };
  const top = rawLinted.filter((l) => l.rank <= 1000);
  const rest = rawLinted.filter((l) => l.rank > 1000);

  const rules: Record<string, RuleStat> = {};
  for (const id of [...ruleIds].sort()) {
    const all = band(rawLinted, id);
    const [low, high] = wilson(all.sites, all.linted);
    const renderedSites = renderedLinted.filter((l) => (l.rendered.counts?.[id] ?? 0) > 0).length;
    rules[id] = {
      raw: { sites: all.sites, rate: all.rate, ci: [round(low), round(high)], top1k: band(top, id), rest: meta.n > 1000 ? band(rest, id) : null },
      rendered: { sites: renderedSites, rate: renderedLinted.length === 0 ? 0 : round(renderedSites / renderedLinted.length) },
    };
  }
  const times = lines.map((l) => l.fetchedAt).sort();
  return {
    list: { source: "tranco", id: meta.listId, created: meta.listCreated, n: meta.n },
    deadhead: { version: meta.version, commit: meta.commit },
    snapshot: { first: times[0] ?? null, last: times.at(-1) ?? null },
    coverage,
    rules,
  };
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      lint: { type: "string" },
      "list-meta": { type: "string" },
      out: { type: "string", default: "corpus/results" },
    },
  });
  if (values.lint === undefined || values["list-meta"] === undefined) throw new Error("--lint <jsonl> and --list-meta <list-ID.json> are required");
  const lines = (await readFile(values.lint, "utf8")).trim().split("\n").map((l) => JSON.parse(l) as LintLine);
  const list = JSON.parse(await readFile(values["list-meta"], "utf8")) as { id: string; created: string | null; n: number };
  const { version } = JSON.parse(await readFile("packages/cli/package.json", "utf8")) as { version: string };
  const commit = /lint-([0-9a-f]+)\.jsonl$/.exec(basename(values.lint))?.[1] ?? "unknown";
  const n = Math.max(...lines.map((l) => l.rank));
  const ruleIds = (await loadRules()).map((r) => r.meta.ruleId);
  const result = aggregate(lines, ruleIds, { listId: list.id, listCreated: list.created, n, version, commit });
  await mkdir(values.out, { recursive: true });
  const file = join(values.out, `${(result.snapshot.last ?? "unknown").slice(0, 10)}-top${n}.json`);
  await writeFile(file, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`${file}: ${JSON.stringify(result.coverage.raw)}`);
}
