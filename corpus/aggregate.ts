import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";

import type { Severity } from "../packages/core/vocabulary.ts";
import { loadRules } from "../packages/rules/load.ts";
import { duplicateRanks } from "./classify.ts";
import { summary, type Summary } from "./metrics.ts";
import { wilson } from "./stats.ts";
import type { LintLine } from "./types.ts";

/** An item or platform seen on fewer sites stays out of the aggregate: rare keys can name a site. */
export const MIN_ITEM_SITES = 10;
/** Platforms with fewer linted sites are too few to compare. */
export const MIN_PLATFORM_SITES = 30;

export type Band = { linted: number; sites: number; rate: number };
export type RuleStat = {
  /** `charsetHeader`: the rule's sites whose response named a charset in Content-Type. */
  raw: { sites: number; rate: number; ci: [number, number]; top1k: Band; rest: Band | null; charsetHeader: number };
  rendered: { sites: number; rate: number; injected: { sites: number; share: number } };
};
export type Rate = { sites: number; rate: number; ci: [number, number] };
export type PlatformStat = {
  sites: number;
  perPage: { rules: number; findings: number };
  severity: Record<Severity | "any", number>;
  savedBrotli: number;
  /** Rules most over-represented on the platform: rate there against the rate overall. */
  top: { rule: string; rate: number; lift: number }[];
};
export type Aggregate = {
  list: { source: "tranco"; id: string; created: string | null; n: number };
  deadhead: { version: string; commit: string };
  snapshot: { first: string | null; last: string | null };
  coverage: { raw: Record<string, number>; rendered: Record<string, number> };
  rules: Record<string, RuleStat>;
  severity: Record<Severity | "any", Rate>;
  perPage: { rules: Summary; findings: Summary };
  bytes: {
    pages: number;
    page: { raw: Summary; gzip: Summary; brotli: Summary };
    saved: { raw: Summary; gzip: Summary; brotli: Summary };
    /** Raw bytes the fixes of each rule remove, over the sites where they remove any. */
    rules: Record<string, { sites: number } & Summary>;
    items: Record<string, { sites: number } & Summary>;
  };
  platforms: Record<string, PlatformStat>;
};
export type AggregateMeta = { listId: string; listCreated: string | null; n: number; version: string; commit: string };

const round = (x: number): number => Math.round(x * 1e4) / 1e4;

const bump = (counts: Record<string, number>, key: string): void => {
  counts[key] = (counts[key] ?? 0) + 1;
};

/** Per-rule rates over the linted, de-duplicated sites. Domain names stay out. */
export function aggregate(lines: LintLine[], ruleIds: string[], meta: AggregateMeta, severities: Readonly<Record<string, Severity>> = {}): Aggregate {
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
  // Sites linted raw and rendered: the only ones where "added by scripts" can be told apart.
  const both = rawLinted.filter((l) => l.rendered.outcome === "linted");
  const top = rawLinted.filter((l) => l.rank <= 1000);
  const rest = rawLinted.filter((l) => l.rank > 1000);

  const rules: Record<string, RuleStat> = {};
  for (const id of [...ruleIds].sort()) {
    const all = band(rawLinted, id);
    const [low, high] = wilson(all.sites, all.linted);
    const renderedSites = renderedLinted.filter((l) => (l.rendered.counts?.[id] ?? 0) > 0).length;
    const inBoth = both.filter((l) => (l.rendered.counts?.[id] ?? 0) > 0);
    const injected = inBoth.filter((l) => (l.raw.counts?.[id] ?? 0) === 0).length;
    rules[id] = {
      raw: {
        sites: all.sites,
        rate: all.rate,
        ci: [round(low), round(high)],
        top1k: band(top, id),
        rest: meta.n > 1000 ? band(rest, id) : null,
        charsetHeader: rawLinted.filter((l) => l.charsetHeader && (l.raw.counts?.[id] ?? 0) > 0).length,
      },
      rendered: {
        sites: renderedSites,
        rate: renderedLinted.length === 0 ? 0 : round(renderedSites / renderedLinted.length),
        injected: { sites: injected, share: inBoth.length === 0 ? 0 : round(injected / inBoth.length) },
      },
    };
  }
  const times = lines.map((l) => l.fetchedAt).sort();
  const levels: (Severity | "any")[] = ["harmful", "deprecated", "unnecessary", "any"];
  const hasLevel = (l: LintLine, level: Severity | "any"): boolean =>
    Object.entries(l.raw.counts ?? {}).some(([id, n]) => n > 0 && (level === "any" || severities[id] === level));
  const rate = (subset: LintLine[], test: (l: LintLine) => boolean): Rate => {
    const sites = subset.filter(test).length;
    const [lo, hi] = wilson(sites, subset.length);
    return { sites, rate: subset.length === 0 ? 0 : round(sites / subset.length), ci: [round(lo), round(hi)] };
  };
  const severity = Object.fromEntries(levels.map((level) => [level, rate(rawLinted, (l) => hasLevel(l, level))])) as Record<Severity | "any", Rate>;
  const ruleCount = (l: LintLine): number => Object.values(l.raw.counts ?? {}).filter((n) => n > 0).length;
  const findingCount = (l: LintLine): number => Object.values(l.raw.counts ?? {}).reduce((sum, n) => sum + n, 0);

  const measured = rawLinted.filter((l) => l.raw.bytes !== null);
  const pick = (key: keyof NonNullable<LintLine["raw"]["bytes"]>): Summary => summary(measured.map((l) => l.raw.bytes?.[key] ?? 0));
  const perKey = (field: "fixBytes" | "items", minSites: number): Record<string, { sites: number } & Summary> => {
    const values = new Map<string, number[]>();
    for (const l of measured) for (const [key, n] of Object.entries(l.raw[field] ?? {})) if (n > 0) (values.get(key) ?? values.set(key, []).get(key)!).push(n);
    return Object.fromEntries(
      [...values].filter(([, xs]) => xs.length >= minSites).sort(([a], [b]) => a.localeCompare(b)).map(([key, xs]) => [key, { sites: xs.length, ...summary(xs) }]),
    );
  };

  const platforms: Record<string, PlatformStat> = {};
  const names = [...new Set(rawLinted.flatMap((l) => l.platforms))].sort();
  for (const name of names) {
    const on = rawLinted.filter((l) => l.platforms.includes(name));
    if (on.length < MIN_PLATFORM_SITES) continue;
    const ratesHere = Object.keys(rules)
      .map((rule) => {
        const here = on.filter((l) => (l.raw.counts?.[rule] ?? 0) > 0).length / on.length;
        const overall = rules[rule]?.raw.rate ?? 0;
        return { rule, rate: round(here), lift: overall === 0 ? 0 : Math.round((here / overall) * 100) / 100 };
      })
      .filter((r) => r.rate >= 0.1 && r.lift > 1)
      .sort((a, b) => b.lift - a.lift || b.rate - a.rate)
      .slice(0, 5);
    platforms[name] = {
      sites: on.length,
      perPage: { rules: summary(on.map(ruleCount)).median, findings: summary(on.map(findingCount)).median },
      severity: Object.fromEntries(levels.map((level) => [level, rate(on, (l) => hasLevel(l, level)).rate])) as Record<Severity | "any", number>,
      savedBrotli: summary(on.map((l) => l.raw.bytes?.savedBrotli ?? 0)).median,
      top: ratesHere,
    };
  }
  return {
    list: { source: "tranco", id: meta.listId, created: meta.listCreated, n: meta.n },
    deadhead: { version: meta.version, commit: meta.commit },
    snapshot: { first: times[0] ?? null, last: times.at(-1) ?? null },
    coverage,
    rules,
    severity,
    perPage: { rules: summary(rawLinted.map(ruleCount)), findings: summary(rawLinted.map(findingCount)) },
    bytes: {
      pages: measured.length,
      page: { raw: pick("page"), gzip: pick("gzip"), brotli: pick("brotli") },
      saved: { raw: pick("saved"), gzip: pick("savedGzip"), brotli: pick("savedBrotli") },
      rules: perKey("fixBytes", 1),
      items: perKey("items", MIN_ITEM_SITES),
    },
    platforms,
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
  const loaded = await loadRules();
  const ruleIds = loaded.map((r) => r.meta.ruleId);
  const severities = Object.fromEntries(loaded.map((r) => [r.meta.ruleId, r.meta.severity]));
  const result = aggregate(lines, ruleIds, { listId: list.id, listCreated: list.created, n, version, commit }, severities);
  await mkdir(values.out, { recursive: true });
  const file = join(values.out, `${(result.snapshot.last ?? "unknown").slice(0, 10)}-top${n}.json`);
  await writeFile(file, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`${file}: ${JSON.stringify(result.coverage.raw)}`);
}
