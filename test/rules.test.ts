import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  type LoadedRule,
  ROOT,
  checkLogicModules,
  checkTagUsage,
  loadRules,
  parseRuleFile,
} from "../scripts/rules-source.ts";

const { rules, diagnostics } = await loadRules();

const format = (list: typeof diagnostics): string =>
  list.map((d) => `${d.file}:${d.line}:${d.col}  ${d.message}`).join("\n");

test("every rule in content/rules validates", () => {
  assert.equal(format(diagnostics), "");
  assert.ok(rules.length > 0, "expected at least one rule");
});

test("every declared logic module exists, and none is an orphan", async () => {
  assert.equal(format(await checkLogicModules(rules)), "");
});

test("every tag groups at least two rules", () => {
  assert.equal(format(checkTagUsage(rules)), "");
});

test("a tag carried by a single rule is reported at that rule", () => {
  const base = rules[0]!;
  const one: LoadedRule = { file: "content/rules/meta/a.md", meta: { ...base.meta, ruleId: "meta/a", tags: ["forms", "mozilla"] } };
  const two: LoadedRule = { file: "content/rules/meta/b.md", meta: { ...base.meta, ruleId: "meta/b", tags: ["forms"] } };
  const found = checkTagUsage([one, two]);
  assert.equal(found.length, 1);
  assert.equal(found[0]!.file, "content/rules/meta/a.md");
  assert.match(found[0]!.message, /`mozilla`/);
});

test("the corpus covers all three rule shapes", () => {
  const shapes = {
    "selector only": rules.filter((r) => r.meta.selector !== null && r.meta.match === null),
    "selector + logic": rules.filter(
      (r) => r.meta.kind === "element" && r.meta.selector !== null && r.meta.match === "logic",
    ),
    document: rules.filter((r) => r.meta.kind === "document"),
  };
  for (const [shape, matching] of Object.entries(shapes)) {
    assert.ok(matching.length > 0, `no rule exercises the "${shape}" shape`);
  }
});

test("logic modules export the entry point their kind requires", async () => {
  for (const rule of rules) {
    if (rule.meta.match !== "logic") continue;
    const module: Record<string, unknown> = await import(
      resolve(ROOT, "packages/rules/logic", `${rule.meta.ruleId}.ts`)
    );
    if (rule.meta.kind === "document") {
      assert.equal(typeof module["check"], "function", `${rule.meta.ruleId} must export check()`);
      assert.equal(module["fixable"], undefined, `${rule.meta.ruleId}: fixable is for element rules`);
      continue;
    }
    // An element module exports match(), fixable() or both.
    assert.ok(
      typeof module["match"] === "function" || typeof module["fixable"] === "function",
      `${rule.meta.ruleId} must export match() or fixable()`,
    );
    if (module["fixable"] !== undefined) {
      assert.equal(typeof module["fixable"], "function", rule.meta.ruleId);
      assert.notEqual(rule.meta.fix.op, "none", `${rule.meta.ruleId}: fixable with no fix to veto`);
    }
  }
});

test("every rule has a valid.html and an invalid.html fixture", async () => {
  for (const rule of rules) {
    for (const name of ["valid.html", "invalid.html"]) {
      const path = resolve(ROOT, "test/fixtures", rule.meta.ruleId, name);
      const info = await stat(path).catch(() => null);
      assert.ok(info?.isFile(), `missing fixture test/fixtures/${rule.meta.ruleId}/${name}`);
      assert.ok((info?.size ?? 0) > 0, `empty fixture test/fixtures/${rule.meta.ruleId}/${name}`);
    }
  }
});

test("fixtures are LF and UTF-8, because fixes are byte offsets into them", async () => {
  for (const rule of rules) {
    for (const name of ["valid.html", "invalid.html"]) {
      const path = resolve(ROOT, "test/fixtures", rule.meta.ruleId, name);
      const bytes = await readFile(path);
      assert.ok(!bytes.includes(0x0d), `CRLF in test/fixtures/${rule.meta.ruleId}/${name}`);
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      assert.equal(Buffer.byteLength(text, "utf8"), bytes.length);
    }
  }
});

// --- diagnostics point at the offending line --------------------------------
// The whole reason `yaml` is a dependency: its document AST carries source
// ranges, so a contributor gets a line number instead of "somewhere above".

const FILE = resolve(ROOT, "content/rules/meta/example.md");

const doc = (frontmatter: string): string =>
  `---\n${frontmatter}---\n\nWhat it is.\n\n## Why avoid\n\nBecause.\n\n## Use instead\n\nDelete it.\n\n## Detectability\n\nFully.\n\n## Resources\n\n- https://example.com/one\n- https://example.com/two\n`;

const VALID_FRONTMATTER = [
  'ruleId: "meta/example"\n',
  'title: "<meta name=\\"example\\">"\n',
  'description: "One-line summary."\n',
  'pubDate: "2026-01-02"\n',
  'status: "avoid"\n',
  'severity: "unnecessary"\n',
  'standardsBasis: "spec"\n',
  'detectability: "yes"\n',
  'kind: "element"\n',
  'scope: "head"\n',
  "selector: 'meta[name=example]'\n",
  'fix: { op: "remove-element" }\n',
  'replacement: "Delete it."\n',
].join("");

test("a synthetic well-formed rule parses cleanly", () => {
  const { rule, diagnostics: found } = parseRuleFile(FILE, doc(VALID_FRONTMATTER));
  assert.equal(format(found), "");
  assert.equal(rule?.meta.ruleId, "meta/example");
  assert.equal(rule?.file, "content/rules/meta/example.md");
});

test("a bad enum value is reported at its own line", () => {
  const source = doc(VALID_FRONTMATTER.replace('severity: "unnecessary"', 'severity: "warning"'));
  const { diagnostics: found } = parseRuleFile(FILE, source);
  assert.equal(found.length, 1);
  assert.equal(found[0]?.file, "content/rules/meta/example.md");
  assert.equal(found[0]?.line, 7); // line 1 is the opening `---`
  assert.equal(found[0]?.col, 1);
  assert.match(found[0]?.message ?? "", /unknown value `warning`/);
});

test("a nested fix.op is reported at the `op` key, not at `fix`", () => {
  const source = doc(VALID_FRONTMATTER.replace('op: "remove-element"', 'op: "rewrite"'));
  const { diagnostics: found } = parseRuleFile(FILE, source);
  assert.equal(found.length, 1);
  assert.equal(found[0]?.line, 13);
  assert.equal(found[0]?.col, 8); // the `op` key inside the flow mapping
});

test("an unknown field is reported at the key that is not recognised", () => {
  const source = doc(`${VALID_FRONTMATTER}sevrity: "harmful"\n`);
  const { diagnostics: found } = parseRuleFile(FILE, source);
  assert.equal(found.length, 1);
  assert.equal(found[0]?.line, 15);
  assert.match(found[0]?.message ?? "", /unknown frontmatter field `sevrity`/);
});

test("ruleId must match the file path", () => {
  const source = doc(VALID_FRONTMATTER.replace("meta/example", "meta/renamed"));
  const { rule, diagnostics: found } = parseRuleFile(FILE, source);
  assert.equal(rule, null);
  assert.equal(found.length, 1);
  assert.equal(found[0]?.line, 2);
  assert.match(found[0]?.message ?? "", /expected content\/rules\/meta\/renamed\.md/);
});

test("broken YAML is reported as YAML, not as a schema failure", () => {
  const { diagnostics: found } = parseRuleFile(FILE, doc('ruleId: "meta/example\n'));
  assert.ok(found.length > 0);
  assert.match(found[0]?.message ?? "", /^invalid YAML:/);
});

test("prose problems are reported even when the frontmatter is also wrong", () => {
  const source = doc(VALID_FRONTMATTER.replace('status: "avoid"', 'status: "nonsense"')).replace(
    "- https://example.com/two\n",
    "",
  );
  const { diagnostics: found } = parseRuleFile(FILE, source);
  const joined = format(found);
  assert.match(joined, /unknown value `nonsense`/);
  assert.match(joined, /at least two independent sources/);
});

// --- logic modules and markdown must account for each other -----------------

const withLogicDir = async (
  files: string[] | Record<string, string>,
  run: (dir: string) => Promise<void>,
): Promise<void> => {
  const dir = await mkdtemp(join(tmpdir(), "deadhead-logic-"));
  const contents = Array.isArray(files)
    ? Object.fromEntries(files.map((file) => [file, "export const match = () => false;\n"]))
    : files;
  try {
    for (const [file, text] of Object.entries(contents)) {
      await mkdir(dirname(join(dir, file)), { recursive: true });
      await writeFile(join(dir, file), text);
    }
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const ruleDeclaringLogic: LoadedRule = (() => {
  const source = doc(VALID_FRONTMATTER.replace("selector:", 'match: "logic"\nselector:'));
  const { rule, diagnostics: found } = parseRuleFile(FILE, source);
  if (!rule) throw new Error(`test fixture should parse:\n${format(found)}`);
  return rule;
})();

test("a rule declaring match: logic without a module is reported", async () => {
  await withLogicDir([], async (dir) => {
    const found = await checkLogicModules([ruleDeclaringLogic], dir);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.file, "content/rules/meta/example.md");
    assert.match(found[0]?.message ?? "", /meta\/example\.ts does not exist/);
  });
});

test("a logic module with no markdown behind it is reported as an orphan", async () => {
  await withLogicDir(["meta/example.ts", "link/ghost.ts"], async (dir) => {
    const found = await checkLogicModules([ruleDeclaringLogic], dir);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.file, "packages/rules/logic/link/ghost.ts");
    assert.match(found[0]?.message ?? "", /orphan logic module/);
  });
});

test("a matched pair is silent", async () => {
  await withLogicDir(["meta/example.ts"], async (dir) => {
    assert.equal(format(await checkLogicModules([ruleDeclaringLogic], dir)), "");
  });
});

/** A synthetic `meta/example` rule declaring logic, with frontmatter lines swapped in. */
const logicRule = (...swaps: [string, string][]): LoadedRule => {
  let frontmatter = VALID_FRONTMATTER.replace("selector:", 'match: "logic"\nselector:');
  for (const [from, to] of swaps) frontmatter = frontmatter.replace(from, to);
  const { rule, diagnostics: found } = parseRuleFile(FILE, doc(frontmatter));
  if (!rule) throw new Error(`test fixture should parse:\n${format(found)}`);
  return rule;
};

test("an element module may export fixable() alone", async () => {
  await withLogicDir({ "meta/example.ts": "export const fixable = () => true;\n" }, async (dir) => {
    assert.equal(format(await checkLogicModules([ruleDeclaringLogic], dir)), "");
  });
});

test("a module with neither match() nor fixable() is reported", async () => {
  await withLogicDir({ "meta/example.ts": "export const helper = 1;\n" }, async (dir) => {
    assert.equal(
      format(await checkLogicModules([ruleDeclaringLogic], dir)),
      "packages/rules/logic/meta/example.ts:1:1  an element rule's module must export match(), fixable() or both",
    );
  });
});

test("fixable() on a rule whose fix op is none is reported at the export", async () => {
  const rule = logicRule(['fix: { op: "remove-element" }', 'fix: { op: "none" }']);
  const text = 'import x from "y";\n\nexport const match = () => true;\nexport const fixable = () => true;\n';
  await withLogicDir({ "meta/example.ts": text }, async (dir) => {
    assert.equal(
      format(await checkLogicModules([rule], dir)),
      "packages/rules/logic/meta/example.ts:4:14  exports `fixable` but the rule's fix op is `none`: there is no fix to veto",
    );
  });
});

test("fixable() on a document rule is reported at the export", async () => {
  const rule = logicRule(['kind: "element"', 'kind: "document"']);
  const text = "export const check = () => [];\nexport function fixable() { return true; }\n";
  await withLogicDir({ "meta/example.ts": text }, async (dir) => {
    assert.equal(
      format(await checkLogicModules([rule], dir)),
      "packages/rules/logic/meta/example.ts:2:17  `fixable` is for element rules: a document rule decides its findings, and their fixes, in check()",
    );
  });
});

test("a remove-tokens rule's module may veto fixes but not decide findings", async () => {
  const rule = logicRule(
    ["selector: 'meta[name=example]'", "selector: 'link[rel~=\"index\" i]'"],
    ['fix: { op: "remove-element" }', 'fix: { op: "remove-tokens", attr: "rel" }'],
  );
  await withLogicDir({ "meta/example.ts": "export const fixable = () => true;\n" }, async (dir) => {
    assert.equal(format(await checkLogicModules([rule], dir)), "");
  });
  await withLogicDir({ "meta/example.ts": "export const match = () => true;\n" }, async (dir) => {
    assert.match(format(await checkLogicModules([rule], dir)), /^packages\/rules\/logic\/meta\/example\.ts:1:14 {2}`remove-tokens` cannot pair with match\(\)/);
  });
});

test("a remove-attributes rule's module may veto fixes but not decide findings", async () => {
  const rule = logicRule(
    ["selector: 'meta[name=example]'", "selector: 'a[coords], a[shape]'"],
    ['fix: { op: "remove-element" }', 'fix: { op: "remove-attributes" }'],
  );
  await withLogicDir({ "meta/example.ts": "export const fixable = () => true;\n" }, async (dir) => {
    assert.equal(format(await checkLogicModules([rule], dir)), "");
  });
  await withLogicDir({ "meta/example.ts": "export const match = () => true;\n" }, async (dir) => {
    assert.match(format(await checkLogicModules([rule], dir)), /^packages\/rules\/logic\/meta\/example\.ts:1:14 {2}`remove-attributes` cannot pair with match\(\)/);
  });
});

test("every packages/rules/lib export is used by a logic module", async () => {
  const { checkLibModules } = await import("../scripts/rules-source.ts");
  assert.deepEqual(await checkLibModules(), []);
});

test("checkLibModules sees async functions and types, and type-only imports", async () => {
  const { checkLibModules } = await import("../scripts/rules-source.ts");
  const dir = await mkdtemp(join(tmpdir(), "deadhead-lib-"));
  try {
    const lib = join(dir, "lib");
    const logic = join(dir, "logic", "meta");
    await mkdir(lib, { recursive: true });
    await mkdir(logic, { recursive: true });
    await writeFile(
      join(lib, "x.ts"),
      "export async function load() {}\nexport type Shape = { a: 1 };\nexport interface Box { b: 2 }\n",
    );
    await writeFile(join(logic, "a.ts"), "export const match = () => false;\n");
    const unused = (await checkLibModules(lib, join(dir, "logic"))).map((d) => d.message);
    assert.deepEqual(unused, [
      "`load` is exported but no logic module imports it",
      "`Shape` is exported but no logic module imports it",
      "`Box` is exported but no logic module imports it",
    ]);

    await writeFile(
      join(logic, "a.ts"),
      'import { load } from "../../lib/x.ts";\n' +
        'import type { Shape } from "../../lib/x.ts";\n' +
        'import { type Box } from "../../lib/x.ts";\n',
    );
    assert.deepEqual(await checkLibModules(lib, join(dir, "logic")), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("checkLibModules matches complete JavaScript identifiers including dollar signs", async (t) => {
  const { checkLibModules } = await import("../scripts/rules-source.ts");
  const dir = await mkdtemp(join(tmpdir(), "deadhead-lib-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const lib = join(dir, "lib");
  const logic = join(dir, "logic", "meta");
  await mkdir(lib, { recursive: true });
  await mkdir(logic, { recursive: true });
  await writeFile(join(lib, "x.ts"), "export const $leading = 1;\nexport const trailing$ = 2;\nexport const leading = 3;\nexport const trailing = 4;\n");
  await writeFile(join(logic, "a.ts"), 'import { $leading, trailing$ } from "../../lib/x.ts";\n');
  assert.deepEqual((await checkLibModules(lib, join(dir, "logic"))).map((d) => d.message), [
    "`leading` is exported but no logic module imports it",
    "`trailing` is exported but no logic module imports it",
  ]);
});

test("checkLibModules treats module filenames literally", async (t) => {
  const { checkLibModules } = await import("../scripts/rules-source.ts");
  const dir = await mkdtemp(join(tmpdir(), "deadhead-lib-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const lib = join(dir, "lib");
  const logic = join(dir, "logic", "meta");
  await mkdir(lib, { recursive: true });
  await mkdir(logic, { recursive: true });
  await writeFile(join(lib, "x.ts"), "export const value = 1;\n");
  await writeFile(join(logic, "a.ts"), 'import { value } from "../../lib/xXts";\n');
  assert.equal((await checkLibModules(lib, join(dir, "logic"))).length, 1);
  await writeFile(join(lib, "x+.ts"), "export const extra = 2;\n");
  await writeFile(join(logic, "a.ts"), 'import { value } from "../../lib/x.ts";\nimport { extra } from "../../lib/x+.ts";\n');
  assert.deepEqual(await checkLibModules(lib, join(dir, "logic")), []);
});

test("lib/json-ld someNode walks an array too long to spread into arguments", async () => {
  const { someNode } = await import("../packages/rules/lib/json-ld.ts");
  const huge: unknown[] = Array.from({ length: 500_000 }, () => 0);
  huge.push({ "@type": "Thing" });
  assert.equal(someNode(huge, (node) => node["@type"] === "Thing"), true);
  const wide = Object.fromEntries(Array.from({ length: 500_000 }, (_, i) => [`k${i}`, i]));
  assert.equal(someNode(wide, (node) => node["@type"] === "Thing"), false);
});

test("lib/csp hasDirective reads the first token of each directive, lowercased", async () => {
  const { hasDirective } = await import("../packages/rules/lib/csp.ts");
  const { parseHtml } = await import("../packages/cli/adapter.ts");
  const content = " default-src 'self' ;REPORT-URI /r; ; img-src https://x/navigate-to/";
  const meta = parseHtml(`<meta http-equiv=" Content-Security-Policy " content="${content}">`).doc.querySelector("meta");
  assert.ok(meta);
  for (const name of ["default-src", "report-uri", "img-src"]) assert.equal(hasDirective(meta, name), true, name);
  for (const name of ["navigate-to", "self", "r", "https://x/navigate-to/"]) assert.equal(hasDirective(meta, name), false, name);
  const other = parseHtml(`<meta http-equiv="refresh" content="report-uri /r">`).doc.querySelector("meta");
  assert.ok(other);
  assert.equal(hasDirective(other, "report-uri"), false);
});

/** The `script` element of `<script attrs></script>`, through the CLI adapter. */
const scriptPort = async (attrs: string) => {
  const { parseHtml } = await import("../packages/cli/adapter.ts");
  const port = parseHtml(`<script ${attrs}></script>`).doc.querySelector("script");
  assert.ok(port);
  return port;
};

test("lib/script scriptTypeString follows prepare the script element", async () => {
  const { scriptTypeString } = await import("../packages/rules/lib/script.ts");
  const type = async (attrs: string) => scriptTypeString(await scriptPort(attrs));
  assert.equal(await type(""), "text/javascript");
  assert.equal(await type('type=""'), "text/javascript");
  assert.equal(await type('language=""'), "text/javascript");
  assert.equal(await type('type="" language="vbscript"'), "text/javascript");
  assert.equal(await type('type=" module\t"'), "module");
  assert.equal(await type('type=" " language="javascript"'), "");
  assert.equal(await type('language="vbscript"'), "text/vbscript");
  assert.equal(await type('language=" javascript"'), "text/ javascript");
});

test("lib/script isClassicScript is a JavaScript MIME type essence match", async () => {
  const { isClassicScript, isJavaScriptMimeEssence } = await import("../packages/rules/lib/script.ts");
  const classic = async (attrs: string) => isClassicScript(await scriptPort(attrs));
  assert.equal(await classic(""), true);
  assert.equal(await classic('type="TEXT/JavaScript"'), true);
  assert.equal(await classic('language="JScript"'), true);
  assert.equal(await classic('type="module"'), false);
  assert.equal(await classic('type="importmap"'), false);
  assert.equal(await classic('type="text/javascript; charset=utf-8"'), false);
  assert.equal(await classic('language="vbscript"'), false);
  assert.equal(isJavaScriptMimeEssence("application/x-javascript"), true);
  // ASCII case-insensitive only: U+0130 does not fold to "i".
  assert.equal(isJavaScriptMimeEssence("text/javascrİpt"), false);
});

test("every http-equiv value a rule selector tests is in OWNED_HTTP_EQUIV", async () => {
  const { OWNED_HTTP_EQUIV } = await import("../packages/rules/lib/http-equiv.ts");
  const missing: string[] = [];
  for (const rule of rules) {
    for (const m of (rule.meta.selector ?? "").matchAll(/http-equiv="([^"]+)"/gi)) {
      const value = m[1]!.toLowerCase();
      if (!OWNED_HTTP_EQUIV.has(value)) missing.push(`${rule.meta.ruleId}: ${value}`);
    }
  }
  assert.equal(missing.join(", "), "");
});

test("the registry wires every logic entry statically", async () => {
  const { RULES } = await import("../packages/rules/registry.gen.ts");
  const text = await readFile(new URL("../packages/rules/registry.gen.ts", import.meta.url), "utf8");
  assert.doesNotMatch(text, /import\(/);
  for (const rule of RULES) {
    if (rule.meta.kind === "document") assert.equal(typeof rule.check, "function", rule.meta.ruleId);
    else if (rule.meta.match === "logic") {
      const hasEntry = typeof rule.match === "function" || typeof rule.fixable === "function";
      assert.equal(hasEntry, true, rule.meta.ruleId);
    }
  }
});
