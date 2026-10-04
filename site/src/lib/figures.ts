/**
 * Figures for blog posts, read from a corpus results file
 * (`corpus/results/*.json`). A post never types a number: it writes a token,
 * `{{rate meta/keywords}}`, and the post page replaces it in the rendered HTML
 * with `figure(results, "rate meta/keywords")` at build time (`replaceFigures`). Re-lint, commit a new
 * results file, and every figure in every post follows. An unknown figure,
 * rule or path throws, so a typo fails the build.
 *
 * Tables and charts are HTML strings with no CSS of their own: charts draw in
 * `currentColor`, so they follow the page's light or dark text color.
 */

type Band = { linted: number; sites: number; rate: number };
type RuleStat = {
  raw: { sites: number; rate: number; ci: [number, number]; top1k: Band; rest: Band | null };
  rendered: { sites: number; rate: number; injected?: { sites: number; share: number } };
};
export type Results = {
  list: { id: string; n: number };
  coverage: { raw: Record<string, number>; rendered: Record<string, number> };
  rules: Record<string, RuleStat>;
  platforms?: Record<
    string,
    { sites: number; perPage: { rules: number; findings: number }; severity: Record<string, number>; savedBrotli: number; top: { rule: string; rate: number; lift: number }[] }
  >;
};

const BANDS = ["top1k", "rest", "rendered", "injected"] as const;

const percent = (x: number): string => `${(x * 100).toFixed(1)}%`;
const integer = (x: number): string => x.toLocaleString("en-US");
const bytes = (x: number): string => (x < 1000 ? `${integer(x)} B` : `${(x / 1000).toFixed(1)} kB`);
const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ruleLink = (id: string): string => `<a href="/rules/${escape(id)}"><code>${escape(id)}</code></a>`;

function ruleStat(results: Results, id: string): RuleStat {
  const stat = results.rules[id];
  if (stat === undefined) throw new Error(`figures: no rule ${id} in the results file`);
  return stat;
}

/** The number at a dotted path. Rule ids hold slashes, not dots, so `rules.meta/keywords.raw.rate` works. */
function numberAt(results: Results, path: string): number {
  let node: unknown = results;
  const rest = path.split(".");
  while (rest.length > 0 && node !== null && typeof node === "object") {
    // A key can hold a dot (`next.js`): take the longest prefix the object has.
    let taken = 0;
    for (let n = rest.length; n > 0; n--) {
      if (Object.hasOwn(node, rest.slice(0, n).join("."))) {
        taken = n;
        break;
      }
    }
    if (taken === 0) break;
    node = (node as Record<string, unknown>)[rest.slice(0, taken).join(".")];
    rest.splice(0, taken);
  }
  if (rest.length > 0 || typeof node !== "number") throw new Error(`figures: no number at ${path}`);
  return node;
}

/** Rules sorted by raw rate, highest first, ties by id. */
const topRules = (results: Results, n: number): [string, RuleStat][] =>
  Object.entries(results.rules)
    .sort(([a, x], [b, y]) => y.raw.rate - x.raw.rate || a.localeCompare(b))
    .slice(0, n);

const interval = (ci: [number, number]): string => `${(ci[0] * 100).toFixed(1)} to ${percent(ci[1])}`;

function rulesTable(results: Results, n: number): string {
  const head = ["Rule", "Sites", "Rate (95% interval)", "Ranks 1 to 1,000", "Ranks 1,001+", "Rendered"];
  const rows = topRules(results, n).map(
    ([id, s]) =>
      `<tr><td>${ruleLink(id)}</td><td>${integer(s.raw.sites)}</td><td>${percent(s.raw.rate)} (${interval(s.raw.ci)})</td>` +
      `<td>${percent(s.raw.top1k.rate)}</td><td>${s.raw.rest === null ? "n/a" : percent(s.raw.rest.rate)}</td><td>${percent(s.rendered.rate)}</td></tr>`,
  );
  return `<table><tr>${head.map((h) => `<th scope="col">${escape(h)}</th>`).join("")}</tr>${rows.join("")}</table>`;
}

function platformsTable(results: Results): string {
  const platforms = Object.entries(results.platforms ?? {}).sort(([a, x], [b, y]) => y.sites - x.sites || a.localeCompare(b));
  if (platforms.length === 0) throw new Error("figures: the results file has no platforms");
  const head = ["Platform", "Sites", "Rules per page", "Harmful", "Most over-represented rule"];
  const rows = platforms.map(([name, p]) => {
    const top = p.top[0];
    const lead = top === undefined ? "none" : `${ruleLink(top.rule)}, ${percent(top.rate)}, ${top.lift}× the overall rate`;
    return `<tr><td>${escape(name)}</td><td>${integer(p.sites)}</td><td>${p.perPage.rules}</td><td>${percent(p.severity["harmful"] ?? 0)}</td><td>${lead}</td></tr>`;
  });
  return `<table><tr>${head.map((h) => `<th scope="col">${escape(h)}</th>`).join("")}</tr>${rows.join("")}</table>`;
}

/**
 * Horizontal bars, one per rule, each with its 95% interval as a whisker.
 * `rendered` adds a lighter bar for the rendered rate under each raw bar.
 */
function rulesChart(results: Results, n: number, rendered: boolean): string {
  const rules = topRules(results, n);
  const id = `chart-rules-${n}${rendered ? "-rendered" : ""}`;
  const label = 300;
  const plot = 300;
  const row = rendered ? 34 : 22;
  const width = label + plot + 70;
  const height = rules.length * row + 30;
  const max = Math.min(1, Math.ceil(Math.max(...rules.map(([, s]) => Math.max(s.raw.ci[1], rendered ? s.rendered.rate : 0))) * 10) / 10);
  const x = (rate: number): number => label + (rate / max) * plot;
  const parts = rules.map(([rule, s], i) => {
    const y = 10 + i * row;
    const bar = `<rect x="${label}" y="${y}" width="${(x(s.raw.rate) - label).toFixed(1)}" height="12" fill="currentColor" fill-opacity="0.8"/>`;
    const whisker = `<line x1="${x(s.raw.ci[0]).toFixed(1)}" x2="${x(s.raw.ci[1]).toFixed(1)}" y1="${y + 6}" y2="${y + 6}" stroke="currentColor"/>`;
    const value = `<text x="${(x(s.raw.ci[1]) + 6).toFixed(1)}" y="${y + 10}" font-size="11">${percent(s.raw.rate)}</text>`;
    const second = rendered
      ? `<path d="M${label} ${y + 15}h${(x(s.rendered.rate) - label).toFixed(1)}v8h-${(x(s.rendered.rate) - label).toFixed(1)}z" fill="currentColor" fill-opacity="0.35"/>` +
        `<text x="${(x(s.rendered.rate) + 6).toFixed(1)}" y="${y + 23}" font-size="11">${percent(s.rendered.rate)}</text>`
      : "";
    return `<text x="${label - 8}" y="${y + 10}" font-size="11" text-anchor="end" font-family="monospace">${escape(rule)}</text>${bar}${whisker}${value}${second}`;
  });
  const axis = `<text x="${label}" y="${height - 4}" font-size="11">0%</text><text x="${label + plot}" y="${height - 4}" font-size="11" text-anchor="end">${percent(max)}</text>`;
  const title = rendered
    ? `The ${n} most frequent rules, raw HTML (dark) against the rendered DOM (light)`
    : `The ${n} most frequent rules on raw HTML, with 95% intervals`;
  const svg =
    `<svg role="img" aria-labelledby="${id}-title" viewBox="0 0 ${width} ${height}"><title id="${id}-title">${escape(title)}</title>` +
    `${parts.join("")}${axis}</svg>`;
  return `<figure>${svg}<figcaption>${escape(title)}.</figcaption><details><summary>Data</summary>${rulesTable(results, n)}</details></figure>`;
}

/** The HTML or text for one figure token, without the braces: `rate meta/keywords top1k`. */
export function figure(results: Results, token: string): string {
  const [kind = "", ...args] = token.trim().split(/\s+/);
  switch (kind) {
    case "rate": {
      const [id = "", band] = args;
      const s = ruleStat(results, id);
      if (band === undefined) return `${percent(s.raw.rate)} (${interval(s.raw.ci)})`;
      if (!(BANDS as readonly string[]).includes(band)) throw new Error(`figures: unknown band "${band}"`);
      if (band === "top1k") return percent(s.raw.top1k.rate);
      if (band === "rest") return s.raw.rest === null ? "n/a" : percent(s.raw.rest.rate);
      if (band === "rendered") return percent(s.rendered.rate);
      if (s.rendered.injected === undefined) throw new Error(`figures: the results file has no injected share for ${id}`);
      return percent(s.rendered.injected.share);
    }
    case "sites":
      return integer(ruleStat(results, args[0] ?? "").raw.sites);
    case "count":
      return integer(numberAt(results, args[0] ?? ""));
    case "pct":
      return percent(numberAt(results, args[0] ?? ""));
    case "bytes":
      return bytes(numberAt(results, args[0] ?? ""));
    case "table":
      if (args[0] === "rules") return rulesTable(results, Number(args[1] ?? 25));
      if (args[0] === "platforms") return platformsTable(results);
      throw new Error(`figures: unknown table "${args[0] ?? ""}"`);
    case "chart":
      if (args[0] === "rules") return rulesChart(results, Number(args[1] ?? 15), false);
      if (args[0] === "rendered") return rulesChart(results, Number(args[1] ?? 15), true);
      throw new Error(`figures: unknown chart "${args[0] ?? ""}"`);
    default:
      throw new Error(`figures: unknown figure "${kind}"`);
  }
}

/** Figures that render as block HTML; the rest are inline text. */
export const isBlock = (token: string): boolean => /^\s*(table|chart)\b/.test(token);

/**
 * Replace figure tokens in a post's rendered HTML. A block token (table,
 * chart) must be the whole of its paragraph, which it replaces; an inline
 * token becomes escaped text. Code and preformatted text stay as written, so
 * a post can show a token. Runs at page build, so a new results file updates
 * every figure even where the markdown is cached.
 */
export function replaceFigures(html: string, results: Results): string {
  return html
    .split(/(<pre[\s>][\s\S]*?<\/pre>|<code[\s>][\s\S]*?<\/code>)/)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part
        .replace(/<p>\s*\{\{([^{}<]+)\}\}\s*<\/p>/g, (whole, token: string) => (isBlock(token) ? figure(results, token) : whole))
        .replace(/\{\{([^{}<]+)\}\}/g, (_, token: string) => {
          if (isBlock(token)) throw new Error(`figures: {{${token}}} must stand alone in its paragraph`);
          return escape(figure(results, token));
        });
    })
    .join("");
}
