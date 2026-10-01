import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { RuleMeta } from "../packages/core/vocabulary.ts";
import {
  GLOBAL,
  SLIM_KEYS,
  bundleBookmarklet,
  exportsEntry,
  logicEntryFor,
  logicVarName,
  needsLogic,
  toSlimMeta,
} from "../scripts/build-bookmarklet.ts";
import { loadRules } from "../packages/rules/load.ts";

const meta = (overrides: Partial<RuleMeta> = {}): RuleMeta => ({
  ruleId: "test/x",
  title: "Test rule",
  description: "A description.",
  pubDate: "2026-01-01",
  status: "avoid",
  severity: "unnecessary",
  standardsBasis: "spec",
  detectability: "yes",
  kind: "element",
  scope: "head",
  selector: "meta[name]",
  match: null,
  fix: { op: "none", attr: null, token: null },
  replacement: "Delete it.",
  tags: [],
  impacts: [],
  related: [],
  ...overrides,
});

test("slim literals carry exactly the keys the bookmarklet reads", () => {
  const slim = toSlimMeta(meta({}));
  assert.deepEqual([...Object.keys(slim)].sort(), [...SLIM_KEYS].sort());
  assert.deepEqual([...SLIM_KEYS].sort(), [
    "description",
    "detectability",
    "kind",
    "match",
    "ruleId",
    "scope",
    "selector",
    "severity",
  ]);
  // Prose and site data must not ride the javascript: URL; the replacement
  // lives on the rule page each finding links to.
  for (const dropped of ["title", "pubDate", "status", "standardsBasis", "tags", "impacts", "related", "fix", "replacement"]) {
    assert.ok(!(dropped in slim), `${dropped} leaked into the slim literal`);
  }
});

test("match vs check follows kind", () => {
  assert.equal(logicEntryFor(meta({ kind: "document" })), "check");
  assert.equal(logicEntryFor(meta({ kind: "element" })), "match");
  assert.equal(logicVarName(meta({ ruleId: "head/x", kind: "document" })), "check_head_x");
  assert.equal(logicVarName(meta({ ruleId: "meta/x", kind: "element" })), "match_meta_x");
});

test("needsLogic matches the assembly filter", () => {
  assert.equal(needsLogic(meta({ kind: "element", match: null })), false);
  assert.equal(needsLogic(meta({ kind: "element", match: "logic" })), true);
  assert.equal(needsLogic(meta({ kind: "document", match: null })), true);
});

test("a module exporting only fixable() inlines nothing and still reports", async () => {
  const rule = (await loadRules()).find((r) => r.meta.ruleId === "attr/script-language");
  assert.ok(rule?.fixable && !rule.match, "attr/script-language exports fixable() alone");
  assert.equal(needsLogic(rule.meta), true);
  assert.equal(await exportsEntry(rule.meta), false);
  const json = JSON.parse(await readFile(new URL("../packages/rules/rules.json", import.meta.url), "utf8"));
  const bundle = await bundleBookmarklet(json.rules);
  assert.doesNotMatch(bundle, /match_attr_script_language/);
});

test("the appended start call survives minification", async () => {
  const json = JSON.parse(await readFile(new URL("../packages/rules/rules.json", import.meta.url), "utf8"));
  const bundle = await bundleBookmarklet(json.rules);
  assert.ok(bundle.includes(`${GLOBAL}.start(`), "built bundle lost its start call");
  assert.ok(bundle.trimEnd().endsWith(");"), "built bundle must end with the appended start call");
});

test("the javascript: URL fits Firefox's and Safari's 65,536-byte cap", async () => {
  const { bundleBookmarklet } = await import("../scripts/build-bookmarklet.ts");
  const { bookmarkletUrl, MAX_URL_BYTES } = await import("../packages/browser/bookmarklet-url.ts");
  const { readFile } = await import("node:fs/promises");
  const { rules } = JSON.parse(await readFile(new URL("../packages/rules/rules.json", import.meta.url), "utf8"));
  const url = bookmarkletUrl(await bundleBookmarklet(rules));
  assert.ok(url.startsWith("javascript:"));
  assert.ok(Buffer.byteLength(url) <= MAX_URL_BYTES, `URL is ${Buffer.byteLength(url)} bytes`);
});

test("the URL helper stays import-free so the site can use it", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../packages/browser/bookmarklet-url.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /import\s*\(/);
  const { bookmarkletUrl, MAX_URL_BYTES } = await import("../packages/browser/bookmarklet-url.ts");
  assert.equal(MAX_URL_BYTES, 65_536);
  assert.equal(bookmarkletUrl("a b#c%d"), "javascript:a%20b%23c%25d");
  // The leading comment is for DevTools readers; a later comment is code's business.
  assert.equal(bookmarkletUrl("/* deadhead\n * header */\nrun();/* x */"), "javascript:run();/*%20x%20*/");
});
test("bundleBookmarklet builds in memory and never touches .git", async () => {
  const { bundleBookmarklet } = await import("../scripts/build-bookmarklet.ts");
  const { readFile, stat } = await import("node:fs/promises");
  const json = JSON.parse(await readFile(new URL("../packages/rules/rules.json", import.meta.url), "utf8"));
  const bundle = await bundleBookmarklet(json.rules);
  assert.match(bundle, /__deadhead\.start\(/);
  await assert.rejects(stat(new URL("../.git/deadhead/bundle-entry/entry.ts", import.meta.url)));
});
