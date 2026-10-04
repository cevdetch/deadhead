/**
 * Figures for blog posts, read from a corpus results file
 * (`corpus/results/*.json`). A post never types a number: it writes a token,
 * `{{rate meta/keywords}}`, and the post page replaces it in the rendered HTML
 * with `figure(results, "rate meta/keywords")` at build time (`replaceFigures`). Re-lint, commit a new
 * results file, and every figure in every post follows. An unknown figure,
 * rule or path throws, so a typo fails the build.
 *
 * Tables and charts are HTML strings. Charts are lists drawn by the post
 * page's style block in `currentColor`, so they follow light and dark.
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
  // The multiplier: the rule's rate on the platform over its rate everywhere.
  const rows = platforms.map(([name, p]) => {
    const top = p.top[0];
    const lead = top === undefined ? "none" : `${ruleLink(top.rule)} ${top.lift}×`;
    return `<tr><td>${escape(name)}</td><td>${integer(p.sites)}</td><td>${p.perPage.rules}</td><td>${percent(p.severity["harmful"] ?? 0)}</td><td>${lead}</td></tr>`;
  });
  return `<table><tr>${head.map((h) => `<th scope="col">${escape(h)}</th>`).join("")}</tr>${rows.join("")}</table>`;
}

/**
 * A bar chart as HTML: an ordered list, one row per rule, with the rule and
 * its value as real text at the page's size and color, and the bar drawn by
 * CSS from custom properties (`--v` the bar, `--lo`/`--hi` the 95% interval,
 * `--r` the rendered rate). Text in an SVG scales down with the drawing on a
 * phone, and SVG text keeps no page color, so neither is used. Widths are
 * relative to the chart's largest value; the printed value is the rate.
 * The post page's style block draws `.bars`.
 */
function rulesChart(results: Results, n: number, rendered: boolean): string {
  const rules = topRules(results, n);
  const max = Math.max(...rules.map(([, s]) => Math.max(s.raw.ci[1], rendered ? s.rendered.rate : 0)));
  const width = (rate: number): string => `${((rate / max) * 100).toFixed(1)}%`;
  const rows = rules.map(([rule, s]) => {
    const vars = rendered ? `--v:${width(s.raw.rate)};--r:${width(s.rendered.rate)}` : `--v:${width(s.raw.rate)};--lo:${width(s.raw.ci[0])};--hi:${width(s.raw.ci[1])}`;
    const bars = rendered ? `<span class="bar" aria-hidden="true"><i></i><u></u></span>` : `<span class="bar" aria-hidden="true"><i></i><b></b></span>`;
    const value = rendered ? `${percent(s.raw.rate)}<br>${percent(s.rendered.rate)}` : percent(s.raw.rate);
    return `<li style="${vars}">${ruleLink(rule)}${bars}<span class="v">${value}</span></li>`;
  });
  const caption = rendered
    ? `The ${n} most frequent rules: share of sites on raw HTML (top bar) and on the rendered DOM (lower, lighter bar).`
    : `The ${n} most frequent rules: share of linted sites, with the 95% interval as a line.`;
  return `<figure class="bars"><figcaption>${escape(caption)}</figcaption><ol>${rows.join("")}</ol><details><summary>Data</summary>${rulesTable(results, n)}</details></figure>`;
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
    case "share": {
      // One count as a share of another: `share rules.x.raw.charsetHeader rules.x.raw.sites`.
      const whole = numberAt(results, args[1] ?? "");
      if (whole === 0) throw new Error(`figures: ${args[1] ?? ""} is zero`);
      return percent(numberAt(results, args[0] ?? "") / whole);
    }
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
