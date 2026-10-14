import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  applyBaseline,
  readBaseline,
  summarise,
  writeBaseline,
} from "../packages/cli/baseline.ts";
import { ConfigError, loadConfig } from "../packages/cli/config.ts";
import type { FileResult } from "../packages/cli/reporters/index.ts";
import type { Finding } from "../packages/core/types.ts";

const KNOWN = new Set(["meta/http-equiv-x-ua-compatible", "attr/script-type-javascript"]);

const inTempDir = async (run: (dir: string) => Promise<void>): Promise<void> => {
  const dir = await mkdtemp(join(tmpdir(), "deadhead-config-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const withConfig = async (body: string, run: (dir: string) => Promise<void>): Promise<void> =>
  inTempDir(async (dir) => {
    await writeFile(join(dir, "deadhead.config.ts"), body);
    await run(dir);
  });

// --- config -----------------------------------------------------------------

test("no config file is not an error; it is the common case", async () => {
  await inTempDir(async (dir) => {
    assert.equal(await loadConfig(dir, undefined, KNOWN), null);
  });
});

test("an explicit --config that does not exist IS an error", async () => {
  await inTempDir(async (dir) => {
    await assert.rejects(() => loadConfig(dir, "nope.config.ts", KNOWN), ConfigError);
  });
});

test("a valid config loads with its options intact", async () => {
  await withConfig(
    `export default {
       include: ["dist"],
       ignore: ["**/vendor/**"],
       rules: { "attr/script-type-javascript": "off" },
       failOn: "harmful",
       skipTemplates: true,
       baseline: ".baseline.json",
     };`,
    async (dir) => {
      const loaded = await loadConfig(dir, undefined, KNOWN);
      assert.ok(loaded);
      assert.deepEqual(loaded.config.include, ["dist"]);
      assert.deepEqual(loaded.config.rules, { "attr/script-type-javascript": "off" });
      assert.equal(loaded.config.failOn, "harmful");
      assert.equal(loaded.config.skipTemplates, true);
      assert.equal(loaded.config.baseline, ".baseline.json");
    },
  );
});

test("a rule may be re-severitied, not only switched off", async () => {
  await withConfig(
    'export default { rules: { "attr/script-type-javascript": "harmful" } };',
    async (dir) => {
      const loaded = await loadConfig(dir, undefined, KNOWN);
      assert.equal(loaded?.config.rules?.["attr/script-type-javascript"], "harmful");
    },
  );
});

test("a typo in a rule id is an error, not a silently ignored setting", async () => {
  // The failure mode this prevents: a rule you thought you disabled is on.
  await withConfig('export default { rules: { "meta/viewport": "off" } };', async (dir) => {
    await assert.rejects(() => loadConfig(dir, undefined, KNOWN), /unknown rule `meta\/viewport`/);
  });
});

test("unknown options, wrong types and a missing default export are all rejected", async () => {
  const cases: [string, RegExp][] = [
    ["export default { nope: 1 };", /unknown option `nope`/],
    ["export default { include: 'dist' };", /`include` must be a list of strings/],
    ['export default { failOn: "loud" };', /`failOn` must be/],
    ["export default { skipTemplates: 'yes' };", /`skipTemplates` must be a boolean/],
    ['export default { rules: { "meta/http-equiv-x-ua-compatible": "loud" } };', /must be "off" or/],
    ["export default 42;", /must be an object/],
    ["export const config = {};", /must `export default`/],
  ];
  for (const [body, expected] of cases) {
    await withConfig(body, async (dir) => {
      await assert.rejects(() => loadConfig(dir, undefined, KNOWN), expected, body);
    });
  }
});

// --- baseline ---------------------------------------------------------------

const finding = (ruleId: string): Finding => ({
  ruleId,
  severity: "unnecessary",
  possible: false,
  message: "m",
  replacement: "r",
  url: `https://deadhead.cevdet.ch/rules/${ruleId}`,
  loc: null,
  range: null,
  node: { tag: "meta", snippet: "<meta>" },
  fix: null,
});

const result = (file: string, ...ruleIds: string[]): FileResult => ({
  file,
  findings: ruleIds.map(finding),
  fixed: 0,
  warnings: [],
});

test("a baseline counts findings per file per rule", () => {
  const baseline = summarise([result("a.html", "r/one", "r/one", "r/two"), result("b.html")]);
  assert.deepEqual(baseline.entries, { "a.html": { "r/one": 2, "r/two": 1 } });
  assert.equal("b.html" in baseline.entries, false, "clean files are not recorded");
});

test("baseline output is sorted, so the file diffs cleanly in review", () => {
  const baseline = summarise([result("b.html", "z/late"), result("a.html", "z/late", "a/early")]);
  assert.deepEqual(Object.keys(baseline.entries), ["a.html", "b.html"]);
  assert.deepEqual(Object.keys(baseline.entries["a.html"] ?? {}), ["a/early", "z/late"]);
});

test("a baseline absorbs exactly what it accounts for and no more", () => {
  const baseline = summarise([result("a.html", "r/one", "r/one")]);
  const { results } = applyBaseline([result("a.html", "r/one", "r/one", "r/one")], baseline);
  assert.equal(results[0]?.findings.length, 1, "the third is new and must be reported");
});

test("a different rule is never absorbed by another rule's allowance", () => {
  const baseline = summarise([result("a.html", "r/one", "r/one")]);
  const { results } = applyBaseline([result("a.html", "r/one", "r/two")], baseline);
  assert.deepEqual(results[0]?.findings.map((f) => f.ruleId), ["r/two"]);
});

test("fixing the backlog is reported as entries no longer needed", () => {
  const baseline = summarise([result("a.html", "r/one", "r/one", "r/one")]);
  const { results, resolved } = applyBaseline([result("a.html", "r/one")], baseline);
  assert.equal(results[0]?.findings.length, 0);
  assert.equal(resolved, 2);
});

test("an empty baseline changes nothing", () => {
  const { results, resolved } = applyBaseline([result("a.html", "r/one")], { version: 1, entries: {} });
  assert.equal(results[0]?.findings.length, 1);
  assert.equal(resolved, 0);
});

test("a baseline round-trips through disk", async () => {
  await inTempDir(async (dir) => {
    const path = join(dir, "base.json");
    const baseline = summarise([result("a.html", "r/one")]);
    await writeBaseline(path, baseline);
    assert.deepEqual(await readBaseline(path), baseline);
  });
});

test("a missing or malformed baseline explains itself", async () => {
  await inTempDir(async (dir) => {
    await assert.rejects(() => readBaseline(join(dir, "nope.json")), /no such baseline file/);
    await writeFile(join(dir, "bad.json"), "{oops");
    await assert.rejects(() => readBaseline(join(dir, "bad.json")), /not valid JSON/);
    await writeFile(join(dir, "wrong.json"), '{"version":99}');
    await assert.rejects(() => readBaseline(join(dir, "wrong.json")), /not a deadhead baseline/);
  });
});

test("a baseline written from one directory applies from another", async () => {
  const { summarise, applyBaseline } = await import("../packages/cli/baseline.ts");
  const finding = { ruleId: "meta/x", severity: "unnecessary" } as never;
  const base = "/repo";
  const written = summarise([{ file: "/repo/site/a.html", findings: [finding], fixed: 0, warnings: [] }], base);
  assert.deepEqual(Object.keys(written.entries), ["site/a.html"]);
  const applied = applyBaseline([{ file: "site/a.html", findings: [finding], fixed: 0, warnings: [] }], written, base, "/repo");
  assert.equal(applied.results[0]!.findings.length, 0);
});
