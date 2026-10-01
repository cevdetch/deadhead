/**
 * The plugin, executed by real ESLint.
 *
 * The adapter is covered by the three-way conformance suite, but that proves
 * only that the tree is read correctly. Everything between the adapter and a
 * user's editor — whether `deadhead/meta/http-equiv-x-ua-compatible` resolves
 * to this plugin at all, whether `context.report` is called with a shape
 * ESLint accepts, whether positions survive — is only proven by running it.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as htmlParser from "@html-eslint/parser";
import { type ESLint, Linter } from "eslint";

import { collectFiles, lintFiles } from "../../packages/cli/lint.ts";
import { loadRules } from "../../packages/rules/load.ts";
import plugin, { __passes, configs, rules as pluginRules } from "../../packages/eslint-plugin/index.ts";

const rules = await loadRules();
const linter = new Linter();

const allRules = Object.fromEntries(
  rules.map((rule) => [`deadhead/${rule.meta.ruleId}`, "error" as const]),
);

/**
 * ESLint's `Plugin` type is specialised for JavaScript ASTs — its `Node` is
 * `JSSyntaxElement` and its `SourceCode` is the JS one — so a plugin that
 * operates on an HTML AST cannot satisfy it structurally, however correct it
 * is. The cast is confined to this line, and everything below verifies the
 * behaviour it is standing in for.
 */
const asPlugin = plugin as unknown as ESLint.Plugin;

const lint = (source: string, enabled: Record<string, "error"> = allRules) =>
  linter.verify(source, {
    plugins: { deadhead: asPlugin },
    languageOptions: { parser: htmlParser },
    rules: enabled,
  });

test("every rule id resolves to this plugin", () => {
  // An unresolved rule surfaces as a message with a null ruleId, which is easy
  // to miss if you only look at the count.
  const messages = lint('<html><head><meta charset="utf-8"></head><body></body></html>');
  for (const message of messages) {
    assert.notEqual(message.ruleId, null, `unresolved rule: ${message.message}`);
    assert.doesNotMatch(message.message, /Definition for rule/);
  }
});

test("ESLint reports exactly what the CLI reports, at the same positions", async () => {
  const files = await collectFiles(["test/fixtures"]);
  const results = (await lintFiles(files, rules)).results;

  for (const { file, findings } of results) {
    const source = await readFile(file, "utf8");
    // ESLint merges each rule's messages by position; findings tied at one
    // position carry no order, so ties compare by rule id.
    const ordered = (rows: [string, number, number][]): string[] =>
      rows.sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0].localeCompare(b[0])).map(([id, line, col]) => `${id}@${line}:${col}`);
    const expected = ordered(findings.map((f) => [f.ruleId, f.loc?.line ?? 0, f.loc?.col ?? 0]));
    const actual = ordered(lint(source).map((m) => [(m.ruleId ?? "").replace(/^deadhead\//, ""), m.line, m.column]));
    assert.deepEqual(actual, expected, file);
  }
});

test("a finding carries the explanation and the replacement, not just a code", () => {
  const messages = lint(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><meta name="viewport" content="width=device-width">' +
      '<meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body></body></html>',
  );
  assert.equal(messages.length, 1);
  const message = messages[0];
  assert.ok(message);
  assert.match(message.message, /Internet Explorer document modes/);
  assert.match(message.message, /Delete it\./);
  // The range is reported, so editors can underline the element, not the file.
  assert.ok((message.endColumn ?? 0) > message.column);
});

test("a rule's detail reaches the message", async () => {
  const source = await readFile("test/fixtures/head/charset-position/invalid.html", "utf8");
  const messages = lint(source);
  assert.equal(messages.length, 1);
  assert.match(messages[0]?.message ?? "", /past the 1024-byte prescan window/);
});

test("clean fixtures produce nothing", async () => {
  for (const file of await collectFiles(["test/fixtures/*/*/valid.html"])) {
    assert.deepEqual(lint(await readFile(file, "utf8")), [], file);
  }
});

test("suppression comments work through ESLint too", () => {
  const markup = (comment: string) =>
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><meta name="viewport" content="width=device-width">' +
    comment +
    '<meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body></body></html>';
  assert.equal(lint(markup("")).length, 1);
  assert.equal(
    lint(markup("\n<!-- deadhead-disable-next-line meta/http-equiv-x-ua-compatible -->\n")).length,
    0,
  );
});

test("only the enabled rule runs, so severity stays the user's to configure", async () => {
  const source = await readFile("test/fixtures/attr/script-type-javascript/invalid.html", "utf8");
  const only = { "deadhead/meta/http-equiv-x-ua-compatible": "error" as const };
  assert.deepEqual(lint(source, only), []);
  assert.equal(lint(source).length, 3);
});

test("the shipped configs reference rules that exist", () => {
  const names = new Set(Object.keys(pluginRules).map((id) => `deadhead/${id}`));
  for (const [config, body] of Object.entries(configs)) {
    const referenced = Object.keys(body.rules ?? {});
    assert.ok(referenced.length > 0, `${config} enables nothing`);
    for (const id of referenced) assert.ok(names.has(id), `${config} references unknown ${id}`);
  }
  // `recommended` is the subset that is not merely dead weight.
  assert.ok(
    Object.keys(configs.recommended.rules ?? {}).length <
      Object.keys(configs.all.rules ?? {}).length,
    "recommended should be narrower than all",
  );
});

test("every ESLint rule advertises its documentation URL", () => {
  for (const [ruleId, rule] of Object.entries(pluginRules)) {
    const docs = rule.meta?.docs;
    assert.equal(docs?.url, `https://deadhead.cevdet.ch/rules/${ruleId}`);
    assert.ok((docs?.description ?? "").length > 0);
  }
});

// --- autofix ----------------------------------------------------------------

test("ESLint's autofix produces byte-identical output to the CLI's --fix", async () => {
  // The two must not merely both work — they must agree, or a project that
  // runs the CLI in CI and the plugin in editors gets a diff on every save.
  const { applyFixes } = await import("../../packages/core/fix.ts");
  const { parseHtml } = await import("../../packages/cli/adapter.ts");
  const { run } = await import("../../packages/core/index.ts");

  for (const file of await collectFiles(["test/fixtures"])) {
    const source = await readFile(file, "utf8");

    // The CLI's loop: apply, re-analyse, repeat until nothing changes.
    let viaCli = source;
    for (let pass = 0; pass < 10; pass++) {
      const fixes = run(rules, parseHtml(viaCli), { fix: true }).flatMap((f) =>
        f.fix === null ? [] : [f.fix],
      );
      if (fixes.length === 0) break;
      const applied = applyFixes(viaCli, fixes);
      if (applied.applied.length === 0 || applied.output === viaCli) break;
      viaCli = applied.output;
    }

    const viaEslint = linter.verifyAndFix(source, {
      plugins: { deadhead: asPlugin },
      languageOptions: { parser: htmlParser },
      rules: allRules,
    });

    assert.equal(viaEslint.output, viaCli, file);
  }
});

test("a rule with no fix is never declared fixable", () => {
  for (const rule of rules) {
    const eslintRule = pluginRules[rule.meta.ruleId];
    assert.ok(eslintRule);
    const fixable = eslintRule.meta?.fixable;
    if (rule.meta.fix.op === "none") {
      assert.equal(fixable, undefined, `${rule.meta.ruleId} claims fixable but has no fix op`);
    } else {
      assert.equal(fixable, "code", `${rule.meta.ruleId} has a fix op but is not fixable`);
    }
  }
});

test("ESLint never offers a fix the CLI would refuse", async () => {
  // `fix: { op: "none" }` and every `partial` rule must be inert under --fix.
  const source = await readFile("test/fixtures/head/charset-position/invalid.html", "utf8");
  const fixed = linter.verifyAndFix(source, {
    plugins: { deadhead: asPlugin },
    languageOptions: { parser: htmlParser },
    rules: allRules,
  });
  assert.equal(fixed.fixed, false);
  assert.equal(fixed.output, source);
});

test("one engine pass per file, however many rules are on", async () => {
  // The plugin counts its own engine passes (a test hook); patching an ESM
  // binding from outside is not possible.
  const { ESLint } = await import("eslint");
  const parser = await import("@html-eslint/parser");
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{ files: ["**/*.html"], languageOptions: { parser }, plugins: { deadhead: plugin }, rules: configs.all.rules ?? {} }],
  });
  const before = __passes();
  await eslint.lintText("<!doctype html><html><head><title>x</title></head><body></body></html>", { filePath: "a.html" });
  assert.equal(__passes() - before, 1);
});

test("configs.recommended is a complete flat config", async () => {
  const plugin = (await import("../../packages/eslint-plugin/index.ts")).default;
  const rec = plugin.configs.recommended as Record<string, unknown>;
  assert.deepEqual(rec["files"], ["**/*.html"]);
  assert.ok((rec["plugins"] as Record<string, unknown>)["deadhead"]);
  assert.ok((rec["languageOptions"] as Record<string, unknown>)["parser"]);
});
