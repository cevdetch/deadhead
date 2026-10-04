import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";

import { classifyRaw } from "./classify.ts";
import { fetchSite } from "./fetch.ts";
import { parseList } from "./list.ts";
import { render } from "./render.ts";
import type { SnapshotRecord } from "./types.ts";

/** Run `task` over `items`, at most `n` at a time, taking items in order. */
export async function eachLimited<T>(items: T[], n: number, task: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item !== undefined) await task(item, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

/** One gzipped JSON record per domain, sortable by rank. */
export const recordFile = (dir: string, rank: number, domain: string): string =>
  join(dir, `${String(rank).padStart(5, "0")}-${domain}.json.gz`);

const exists = (file: string): Promise<boolean> => access(file).then(() => true, () => false);

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      list: { type: "string" },
      limit: { type: "string" },
      concurrency: { type: "string", default: "8" },
      out: { type: "string", default: "corpus/data/snapshot" },
    },
  });
  if (values.list === undefined) throw new Error("--list <csv> is required; run pnpm corpus:list first");
  const listId = /list-([A-Za-z0-9]+)-\d+\.csv$/.exec(values.list)?.[1] ?? "unknown";
  const all = parseList(await readFile(values.list, "utf8"));
  const sites = values.limit === undefined ? all : all.slice(0, Number(values.limit));
  const out = values.out;
  await mkdir(out, { recursive: true });

  const counts: Record<string, number> = {};
  let done = 0;
  await eachLimited(sites, Number(values.concurrency), async ({ rank, domain }) => {
    const file = recordFile(out, rank, domain);
    if (!(await exists(file))) {
      const fetched = await fetchSite(domain);
      const head = fetched.body?.subarray(0, 20_000).toString("utf8") ?? "";
      const outcome = classifyRaw({
        robots: fetched.robots,
        error: fetched.error,
        status: fetched.status,
        contentType: fetched.contentType,
        bytes: fetched.bytes,
        head,
      });
      const rendered = outcome === "linted" || outcome === "blocked" ? await render(fetched.finalUrl ?? `https://${domain}/`) : null;
      const record: SnapshotRecord = {
        rank,
        domain,
        listId,
        fetchedAt: new Date().toISOString(),
        robots: fetched.robots,
        tried: fetched.tried,
        finalUrl: fetched.finalUrl,
        status: fetched.status,
        contentType: fetched.contentType,
        bytes: fetched.bytes,
        truncated: fetched.truncated,
        error: fetched.error,
        errorMessage: fetched.errorMessage,
        raw: fetched.body?.toString("base64") ?? null,
        rendered: rendered?.dom ?? null,
        renderError: rendered?.error ?? null,
        ms: { robots: fetched.ms.robots, raw: fetched.ms.raw, render: rendered?.ms ?? 0 },
      };
      // Write then rename, so a stopped run never leaves half a record behind.
      await writeFile(`${file}.tmp`, gzipSync(JSON.stringify(record)));
      await rename(`${file}.tmp`, file);
      counts[outcome] = (counts[outcome] ?? 0) + 1;
    }
    done++;
    if (done % 100 === 0) console.log(`${done}/${sites.length} ${JSON.stringify(counts)}`);
  });
  console.log(`done ${done}/${sites.length} ${JSON.stringify(counts)}`);
}
