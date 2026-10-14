import assert from "node:assert/strict";
import test from "node:test";

import { tally, total, totalFixed } from "../packages/cli/reporters/index.ts";
import { stylish } from "../packages/cli/reporters/stylish.ts";
import type { FileResult } from "../packages/cli/reporters/index.ts";
import type { Finding } from "../packages/core/types.ts";

const finding = (ruleId: string, severity: Finding["severity"]): Finding => ({
  ruleId,
  severity,
  possible: false,
  message: "m",
  replacement: "r",
  url: `https://deadhead.cevdet.ch/rules/${ruleId}`,
  loc: null,
  range: null,
  node: { tag: "meta", snippet: "<meta>" },
  fix: null,
});

const result = (file: string, findings: Finding[], fixed = 0): FileResult => ({ file, findings, fixed, warnings: [] });

test("stylish reports more findings than a function's argument limit", () => {
  const findings = Array.from({ length: 150_000 }, () => finding("meta/keywords", "unnecessary"));
  const text = stylish([result("large.html", findings)]);
  assert.match(text, /150000 findings/);
  assert.equal(text.split("https://deadhead.cevdet.ch/rules/meta/keywords").length - 1, findings.length);
});

test("tally counts per severity in harmful, deprecated, unnecessary order", () => {
  const results = [
    result("a.html", [finding("r/one", "harmful"), finding("r/two", "harmful"), finding("r/three", "deprecated")]),
    result("b.html", [finding("r/four", "unnecessary")]),
    result("c.html", []),
  ];
  assert.deepEqual(tally(results), { harmful: 2, deprecated: 1, unnecessary: 1 });
  assert.deepEqual(tally([]), { harmful: 0, deprecated: 0, unnecessary: 0 });
});

test("total counts findings and totalFixed counts applied fixes", () => {
  const results = [result("a.html", [finding("r/one", "harmful")], 2), result("b.html", [], 0)];
  assert.equal(total(results), 1);
  assert.equal(totalFixed(results), 2);
  assert.equal(total([]), 0);
  assert.equal(totalFixed([]), 0);
});

test("exit-code tally drives --fail-on: only severities at or above the floor breach", () => {
  // Mirrors bin/deadhead.ts: threshold fails on itself and everything worse.
  const { SEVERITY_RANK } = { SEVERITY_RANK: { harmful: 3, deprecated: 2, unnecessary: 1 } } as const;
  const counts = tally([result("a.html", [finding("r/one", "unnecessary")])]);
  const breached = (floor: number): boolean =>
    (["harmful", "deprecated", "unnecessary"] as const).some(
      (severity) => counts[severity] > 0 && SEVERITY_RANK[severity] >= floor,
    );
  assert.equal(breached(3), false, "unnecessary does not breach a harmful floor");
  assert.equal(breached(1), true, "unnecessary breaches its own floor");
});
