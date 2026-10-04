/**
 * Blog figures: every number a post shows comes from a corpus results file
 * through these functions, never from prose. An unknown token, rule or path
 * throws, so a typo fails the build instead of shipping a wrong number.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { figure, replaceFigures, type Results } from "../site/src/lib/figures.ts";

const results = JSON.parse(readFileSync(new URL("../corpus/results/2026-10-04-top10000.json", import.meta.url), "utf8")) as Results;
const rule = "meta/twitter-card-names";
const stat = results.rules[rule]!;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

test("figures: a rule's rate, with its interval, its bands and its rendered rate", () => {
  assert.equal(figure(results, `rate ${rule}`), `${pct(stat.raw.rate)} (${pct(stat.raw.ci[0]).replace("%", "")} to ${pct(stat.raw.ci[1])})`);
  assert.equal(figure(results, `rate ${rule} top1k`), pct(stat.raw.top1k.rate));
  assert.equal(figure(results, `rate ${rule} rest`), pct(stat.raw.rest!.rate));
  assert.equal(figure(results, `rate ${rule} rendered`), pct(stat.rendered.rate));
  assert.equal(figure(results, `sites ${rule}`), stat.raw.sites.toLocaleString("en-US"));
});

test("figures: counts, percentages and bytes read any numeric path", () => {
  assert.equal(figure(results, "count coverage.raw.linted"), results.coverage.raw["linted"]!.toLocaleString("en-US"));
  assert.equal(figure(results, "pct rules.meta/keywords.raw.rate"), pct(results.rules["meta/keywords"]!.raw.rate));
  assert.equal(figure(results, "bytes list.n"), "10.0 kB", "10,000 bytes");
  assert.equal(figure(results, "count list.n"), "10,000");
});

test("figures: the platforms table names each platform's most over-represented rule from the data", () => {
  const html = figure(results, "table platforms");
  const [name, platform] = Object.entries(results.platforms!).sort(([, a], [, b]) => b.sites - a.sites)[0]!;
  const top = platform.top[0]!;
  assert.match(html, new RegExp(`<td>${name.replace(".", "\\.")}</td><td>${platform.sites.toLocaleString("en-US")}</td>`));
  assert.ok(html.includes(`${top.rule}</code></a>, ${pct(top.rate)}, ${top.lift}× the overall rate`));
});

test("figures: array indexes and severity paths resolve", () => {
  assert.equal(figure(results, "pct severity.harmful.ci.0"), pct((results as unknown as { severity: { harmful: { ci: number[] } } }).severity.harmful.ci[0]!));
});

test("figures: a typo fails loudly", () => {
  assert.throws(() => figure(results, "rate meta/no-such-rule"), /no rule meta\/no-such-rule/);
  assert.throws(() => figure(results, "count coverage.raw.nope"), /no number at coverage\.raw\.nope/);
  assert.throws(() => figure(results, "sparkle 3"), /unknown figure "sparkle"/);
  assert.throws(() => figure(results, `rate ${rule} sideways`), /unknown band "sideways"/);
});

test("figures: the rules table links every rule and escapes nothing it should not", () => {
  const html = figure(results, "table rules 5");
  assert.equal((html.match(/<tr>/g) ?? []).length, 6, "a header row and five rules");
  assert.match(html, /<a href="\/rules\/attr\/script-type-javascript"><code>attr\/script-type-javascript<\/code><\/a>/);
  assert.match(html, /<th scope="col">Rate \(95% interval\)<\/th>/);
});

test("figures: the chart is an accessible SVG with its data beside it", () => {
  const html = figure(results, "chart rules 5");
  assert.match(html, /^<figure>/);
  assert.match(html, /<svg role="img" aria-labelledby="(chart-[a-z0-9-]+)-title" viewBox="0 0 \d+ \d+">/);
  assert.match(html, /<title id="chart-[a-z0-9-]+-title">/);
  assert.match(html, /<details><summary>Data<\/summary><table>/);
  assert.doesNotMatch(html, /xmlns|xlink|version=/, "inline SVG needs none of them, and deadhead reports two");
  assert.equal((html.match(/<rect /g) ?? []).length, 5, "one bar per rule");
});

test("replaceFigures: inline tokens become text, a block token alone in a paragraph becomes HTML", () => {
  const html = `<p>Seen on {{rate ${rule}}} of sites ({{sites ${rule}}}).</p>\n<p>{{table rules 3}}</p>\n<pre><code>{{rate meta/keywords}}</code></pre>\n<p>Write <code>{{count list.n}}</code>.</p>`;
  const out = replaceFigures(html, results);
  assert.ok(out.startsWith(`<p>Seen on ${figure(results, `rate ${rule}`)} of sites (${figure(results, `sites ${rule}`)}).</p>`));
  assert.match(out, /\n<table><tr>/, "the block token replaces its paragraph");
  assert.match(out, /<pre><code>\{\{rate meta\/keywords\}\}<\/code><\/pre>/, "preformatted code is left as written");
  assert.match(out, /<code>\{\{count list\.n\}\}<\/code>/, "inline code is left as written");
});

test("replaceFigures: a block token inside running text fails", () => {
  assert.throws(() => replaceFigures("<p>Here: {{table rules 3}}</p>", results), /must stand alone/);
});
