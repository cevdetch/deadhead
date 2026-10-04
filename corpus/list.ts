import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

/** Tranco's CSV: "rank,domain" per line. Anything else is skipped. */
export function parseList(csv: string): { rank: number; domain: string }[] {
  return csv
    .split(/\r?\n/)
    .map((line) => {
      const [rank = "", domain = ""] = line.split(",");
      return { rank: Number(rank), domain: domain.trim() };
    })
    .filter((site) => Number.isInteger(site.rank) && site.rank > 0 && site.domain !== "");
}

/**
 * GET `url` and return the response if it is OK. Tranco rate-limits its API,
 * so a 429 or 503 waits and retries; anything else that is not OK throws.
 */
export async function fetchOk(url: string, { attempts = 5, delayMs = 2_000 }: { attempts?: number; delayMs?: number } = {}): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if ((res.status !== 429 && res.status !== 503) || attempt >= attempts) throw new Error(`${url}: HTTP ${res.status}`);
    await res.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
  }
}

const API = "https://tranco-list.eu/api/lists";

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      id: { type: "string" },
      n: { type: "string", default: "10000" },
      out: { type: "string", default: "corpus/data" },
    },
  });
  const latest = values.id === undefined ? ((await (await fetchOk(`${API}/date/latest`)).json()) as { list_id: string }) : null;
  const id = values.id ?? latest?.list_id ?? "";
  if (id === "") throw new Error("no Tranco list id");
  const info = (await (await fetchOk(`${API}/id/${id}`)).json()) as { created_on?: string };
  const csv = await (await fetchOk(`https://tranco-list.eu/download/${id}/${values.n}`)).text();
  const sites = parseList(csv);
  if (sites.length === 0) throw new Error(`list ${id} came back empty`);
  await mkdir(values.out, { recursive: true });
  const file = join(values.out, `list-${id}-${values.n}.csv`);
  await writeFile(file, csv);
  await writeFile(join(values.out, `list-${id}.json`), `${JSON.stringify({ id, created: info.created_on ?? null, n: Number(values.n) }, null, 2)}\n`);
  console.log(`${file}: ${sites.length} domains, Tranco list ${id}, created ${info.created_on ?? "unknown"}`);
}
