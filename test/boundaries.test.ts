import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

async function specifiers(dir: string): Promise<{ file: string; spec: string }[]> {
  const out: { file: string; spec: string }[] = [];
  for (const entry of await readdir(join(ROOT, dir), { recursive: true })) {
    if (!entry.endsWith(".ts")) continue;
    // A published package has its own node_modules and a built dist/; neither is source.
    if (/(^|[\\/])(node_modules|dist)[\\/]/.test(entry)) continue;
    const file = `${dir}/${entry.split("\\").join("/")}`;
    const text = await readFile(join(ROOT, file), "utf8");
    for (const m of text.matchAll(SPEC)) out.push({ file, spec: m[1]! });
  }
  return out;
}

const bad = (list: { file: string; spec: string }[], ok: (spec: string, file: string) => boolean) =>
  list.filter(({ file, spec }) => !ok(spec, file)).map(({ file, spec }) => `${file} → ${spec}`);

test("packages/core imports only itself: it is inlined into the bookmarklet", async () => {
  assert.deepEqual(bad(await specifiers("packages/core"), (s) => s.startsWith("./")), []);
});

test("packages/rules imports only relative files and node: built-ins", async () => {
  assert.deepEqual(bad(await specifiers("packages/rules"), (s) => s.startsWith(".") || s.startsWith("node:")), []);
});

test("rule logic and lib import only relative files: both are inlined into the bookmarklet", async () => {
  for (const dir of ["packages/rules/logic", "packages/rules/lib"]) {
    assert.deepEqual(bad(await specifiers(dir), (s) => s.startsWith("./") || s.startsWith("../")), [], dir);
  }
});

test("parse5 appears only in packages/cli/adapter.ts", async () => {
  const all = [
    ...(await specifiers("packages")),
    ...(await specifiers("scripts")),
  ];
  assert.deepEqual(
    all.filter(({ spec }) => spec === "parse5" || spec.startsWith("parse5/")).map(({ file }) => file),
    ["packages/cli/adapter.ts"],
  );
});

test("@html-eslint/parser appears only in packages/eslint-plugin/", async () => {
  const all = await specifiers("packages");
  assert.deepEqual(
    all.filter(({ spec }) => spec === "@html-eslint/parser" || spec.startsWith("@html-eslint/")).map(({ file }) => file),
    ["packages/eslint-plugin/index.ts"],
  );
});

test("nothing in packages/ imports from site/", async () => {
  assert.deepEqual(bad(await specifiers("packages"), (s) => !s.includes("/site/") && !s.startsWith("site/")), []);
});

test("rule logic never touches a parser or the DOM adapters", async () => {
  const forbidden = ["parse5", "@html-eslint/parser", "linkedom", "/cli/", "/browser/", "/eslint-plugin/"];
  assert.deepEqual(
    bad(await specifiers("packages/rules/logic"), (s) => !forbidden.some((f) => s === f || s.includes(f))),
    [],
  );
});
