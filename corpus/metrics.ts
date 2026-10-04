import { brotliCompressSync, constants, gzipSync } from "node:zlib";

import type { Finding } from "../packages/core/types.ts";
import type { FixOp } from "../packages/core/vocabulary.ts";
import type { Counts, PageBytes } from "./types.ts";

export type Summary = { median: number; mean: number; p90: number; total: number };

const round2 = (x: number): number => Math.round(x * 100) / 100;

/** Nearest-rank median and 90th percentile, mean and total. */
export function summary(values: number[]): Summary {
  if (values.length === 0) return { median: 0, mean: 0, p90: 0, total: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p: number): number => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? 0;
  const total = sorted.reduce((sum, x) => sum + x, 0);
  return { median: rank(0.5), mean: round2(total / sorted.length), p90: rank(0.9), total };
}

const attrValue = (element: string, name: string): string | null => {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(element);
  return match === null ? null : (match[1] ?? match[2] ?? match[3] ?? "").trim().toLowerCase().slice(0, 60);
};

/**
 * What a fix removes, as a stable key across sites: `meta[name=twitter:title]`,
 * `script[type]`, `link[rel~=shortcut]`, or a tag name. `element` is the
 * start of the element's source, `removed` the text the fix deletes.
 */
export function itemKey(element: string, removed: string, op: FixOp | undefined, replacement = ""): string {
  const tag = /^<([a-z][a-z0-9-]*)/i.exec(element)?.[1]?.toLowerCase() ?? "?";
  if (op === "remove-token" || op === "remove-tokens") {
    if (removed.trimStart().startsWith("<")) return `${tag}[rel=${attrValue(element, "rel") ?? ""}]`;
    const kept = new Set(replacement.toLowerCase().split(/\s+/));
    const dropped = removed.toLowerCase().split(/\s+/).filter((token) => token !== "" && !kept.has(token));
    return `${tag}[rel~=${dropped.join(" ")}]`;
  }
  if (op === "remove-attribute") return `${tag}[${/^\s*([^\s=>]+)/.exec(removed)?.[1]?.toLowerCase() ?? "?"}]`;
  if (tag === "meta") {
    for (const name of ["name", "property", "http-equiv", "itemprop"]) {
      const value = attrValue(element, name);
      if (value !== null) return `meta[${name}=${value}]`;
    }
    return /\scharset\b/i.test(element) ? "meta[charset]" : "meta";
  }
  if (tag === "link") return `link[rel=${attrValue(element, "rel") ?? ""}]`;
  return tag;
}

/** Raw bytes each finding's own fix removes, summed per rule and per item. */
export function fixBytes(source: string, findings: Finding[], ops: ReadonlyMap<string, FixOp>): { rules: Counts; items: Counts } {
  const rules: Counts = {};
  const items: Counts = {};
  for (const finding of findings) {
    if (finding.fix === null || finding.range === null) continue;
    const removed = source.slice(finding.fix.range[0], finding.fix.range[1]);
    const bytes = Buffer.byteLength(removed) - Buffer.byteLength(finding.fix.text);
    if (bytes <= 0) continue;
    const element = source.slice(finding.range[0], Math.min(finding.range[1], finding.range[0] + 2_000));
    const key = itemKey(element, removed, ops.get(finding.ruleId), finding.fix.text);
    // A bare tag says nothing about why it went: name the rule.
    const item = key.includes("[") ? key : `${key} (${finding.ruleId})`;
    rules[finding.ruleId] = (rules[finding.ruleId] ?? 0) + bytes;
    items[item] = (items[item] ?? 0) + bytes;
  }
  return { rules, items };
}

/** gzip at level 6 and brotli at quality 5: common defaults for HTML compressed per request. */
const gzip = (text: string): number => gzipSync(text, { level: 6 }).byteLength;
const brotli = (text: string): number => brotliCompressSync(text, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).byteLength;

/** Page size raw, gzip and brotli, and what the full fix saves in each. */
export function pageBytes(before: string, after: string): PageBytes {
  const page = Buffer.byteLength(before);
  const [beforeGzip, beforeBrotli] = [gzip(before), brotli(before)];
  return {
    page,
    gzip: beforeGzip,
    brotli: beforeBrotli,
    saved: page - Buffer.byteLength(after),
    savedGzip: beforeGzip - gzip(after),
    savedBrotli: beforeBrotli - brotli(after),
  };
}
