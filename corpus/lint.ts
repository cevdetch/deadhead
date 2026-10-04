import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";

import { compileForRun, lintSource } from "../packages/cli/lint.ts";
import type { CompiledRules } from "../packages/core/index.ts";
import type { Finding } from "../packages/core/types.ts";
import { loadRules } from "../packages/rules/load.ts";
import { classifyRaw, isBlocked } from "./classify.ts";
import type { Counts, LintLine, SnapshotRecord } from "./types.ts";

/**
 * Rules that read source positions, which a re-serialized DOM does not have.
 * Mirrors SOURCE_DEPENDENT in test/conformance/adapters.test.ts; a test keeps
 * the two equal.
 */
export const RENDER_EXCLUDED: ReadonlySet<string> = new Set(["head/charset-position"]);

const tally = (findings: Finding[]): Counts => {
  const counts: Counts = {};
  for (const finding of findings) counts[finding.ruleId] = (counts[finding.ruleId] ?? 0) + 1;
  return counts;
};

/** Lint one snapshot record, raw and rendered. The raw body is read as UTF-8, as the CLI reads files. */
export function lintRecord(record: SnapshotRecord, compiled: CompiledRules): { line: LintLine; raw: Finding[]; rendered: Finding[] } {
  const html = record.raw === null ? "" : Buffer.from(record.raw, "base64").toString("utf8");
  const rawOutcome = classifyRaw({
    robots: record.robots,
    error: record.error,
    status: record.status,
    contentType: record.contentType,
    bytes: record.bytes,
    head: html.slice(0, 20_000),
  });
  const raw = rawOutcome === "linted" ? lintSource(html, `${record.domain}.raw.html`, compiled, {}).findings : [];

  let renderedOutcome: LintLine["rendered"]["outcome"] = "not-rendered";
  if (record.rendered !== null) renderedOutcome = isBlocked(Buffer.byteLength(record.rendered), record.rendered) ? "blocked" : "linted";
  else if (record.renderError !== null) renderedOutcome = "failed";
  const rendered =
    renderedOutcome === "linted" && record.rendered !== null
      ? lintSource(record.rendered, `${record.domain}.rendered.html`, compiled, {}).findings.filter((f) => !RENDER_EXCLUDED.has(f.ruleId))
      : [];

  const line: LintLine = {
    rank: record.rank,
    domain: record.domain,
    fetchedAt: record.fetchedAt,
    finalOrigin: record.finalUrl === null ? null : new URL(record.finalUrl).origin,
    raw: { outcome: rawOutcome, counts: rawOutcome === "linted" ? tally(raw) : null },
    rendered: { outcome: renderedOutcome, counts: renderedOutcome === "linted" ? tally(rendered) : null },
  };
  return { line, raw, rendered };
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      snapshot: { type: "string", default: "corpus/data/snapshot" },
      out: { type: "string", default: "corpus/data" },
      rule: { type: "string" },
      samples: { type: "string", default: "20" },
    },
  });
  const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  const compiled = compileForRun(await loadRules(), {});
  const files = (await readdir(values.snapshot)).filter((f) => f.endsWith(".json.gz")).sort();
  const lines: string[] = [];
  const samples: string[] = [];
  const wanted = Number(values.samples);
  for (const file of files) {
    const record = JSON.parse(gunzipSync(await readFile(join(values.snapshot, file))).toString("utf8")) as SnapshotRecord;
    const { line, raw } = lintRecord(record, compiled);
    lines.push(JSON.stringify(line));
    if (values.rule !== undefined && samples.length < wanted) {
      for (const finding of raw.filter((f) => f.ruleId === values.rule).slice(0, 1)) {
        samples.push(`#${record.rank} ${record.domain} ${finding.loc?.line ?? "?"}:${finding.loc?.col ?? "?"} ${finding.node.snippet}${finding.detail === undefined ? "" : ` (${finding.detail})`}`);
      }
    }
  }
  const out = join(values.out, `lint-${commit}.jsonl`);
  await writeFile(out, `${lines.join("\n")}\n`);
  console.log(`${out}: ${lines.length} sites`);
  if (values.rule !== undefined) console.log(`\n${values.rule}, ${samples.length} samples (local only, never publish):\n${samples.join("\n")}`);
}
