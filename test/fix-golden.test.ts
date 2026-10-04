import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseHtml } from "../packages/cli/adapter.ts";
import { applyFixes } from "../packages/core/fix.ts";
import { run } from "../packages/core/engine.ts";
import { parseSuppressions } from "../packages/core/suppressions.ts";
import { loadRules } from "../packages/rules/load.ts";

/**
 * Rules whose fix cannot clear every finding on their own fixture. Phase 2's
 * `remove-attributes` op empties this set down to one: `attr/script-event-for`
 * exports `match()`, and `remove-attributes` cannot pair with a module that
 * decides findings (schema forbids it), so it stays on `remove-attribute` and
 * removing `event` from a `for="window" event="onload"` pair leaves a
 * `for`-only finding. A new entry needs a reason in the PR.
 */
const KNOWN_PARTIAL: ReadonlySet<string> = new Set(["attr/script-event-for"]);

/**
 * Rules whose `fixable()` reads the element's siblings, so one page is either
 * all fixable or all vetoed and `invalid.html` cannot hold both. Their vetoed
 * cases live in `test/rules-logic.test.ts`.
 */
const SIBLING_VETO: ReadonlySet<string> = new Set(["meta/apple-mobile-web-app-capable"]);

/**
 * Rules whose removal changes behaviour with no provably safe subset; see the
 * fix-safety review. An entry leaves only with new evidence. Rules where only
 * some cases are unsafe keep their op and veto those findings with
 * `fixable()` instead.
 */
const MUST_NOT_FIX: ReadonlySet<string> = new Set([
  "attr/longdesc-lowsrc",
  // Google skips a qualified canonical; stripping the qualifier makes it count, for whatever URL it names.
  "link/canonical-qualifiers",
  "link/prerender",
  "meta/http-equiv-x-ua-compatible",
]);

const rules = await loadRules();
const fixable = rules.filter((r) => r.meta.fix.op !== "none" && r.meta.detectability !== "partial");

for (const id of MUST_NOT_FIX) {
  test(`${id}: fix op is none`, () => {
    const rule = rules.find((r) => r.meta.ruleId === id);
    assert.ok(rule, `${id} not found`);
    assert.equal(rule.meta.fix.op, "none");
  });
}

/**
 * Every rule with an op must fix something on its own invalid fixture. A rule
 * with `fixable()` has unfixable cases there by design: the loop must end with
 * each remaining finding carrying no fix. A document rule vetoes inside
 * `check()` instead, by reporting a finding without a fix; one that does so on
 * its fixture ends the same way. The rest must clear every finding, or, for
 * KNOWN_PARTIAL, no more than they started with.
 */
for (const rule of fixable) {
  const id = rule.meta.ruleId;
  const original = await readFile(new URL(`fixtures/${id}/invalid.html`, import.meta.url), "utf8");
  const lint = (source: string) => run([rule], parseHtml(source), { suppressions: parseSuppressions(source), fix: true });
  const before = lint(original);
  const vetoes = rule.fixable !== undefined || (rule.meta.kind === "document" && before.some((f) => f.fix === null));
  const ends = vetoes ? "only vetoed findings" : KNOWN_PARTIAL.has(id) ? "no more findings" : "no findings";
  test(`${id}: --fix emits a fix and leaves ${ends} of its own`, async () => {
    assert.ok(before.some((f) => f.fix !== null), "invalid.html produced no fix");

    let source = original;
    for (let pass = 0; pass < 10; pass++) {
      const fixes = lint(source).flatMap((f) => (f.fix === null ? [] : [f.fix]));
      if (fixes.length === 0) break;
      source = applyFixes(source, fixes).output;
    }
    const after = lint(source);
    if (vetoes) {
      assert.notEqual(source, original, "the fix changed nothing");
      if (!SIBLING_VETO.has(id)) assert.ok(after.length > 0, "invalid.html needs a case fixable() vetoes");
      assert.deepEqual(after.filter((f) => f.fix !== null).map((f) => f.node.snippet), []);
    } else if (KNOWN_PARTIAL.has(id)) {
      assert.notEqual(source, original, "the fix changed nothing");
      assert.ok(after.length <= before.length);
    } else assert.deepEqual(after.map((f) => f.node.snippet), []);
  });
}
