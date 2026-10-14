import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../packages/core/engine.ts";
import { createCompiledCache } from "../packages/eslint-plugin/compiled-cache.ts";

test("a repeated subset reuses its compiled object", () => {
  const cache = createCompiledCache(2);
  let calls = 0;
  const create = () => { calls++; return compile([]); };
  const first = cache.getOrCreate("a", create);
  assert.equal(cache.getOrCreate("a", create), first);
  assert.equal(calls, 1);
});

test("reuse refreshes recency and evicts the least recently used subset", () => {
  const cache = createCompiledCache(2);
  const a = cache.getOrCreate("a", () => compile([]));
  const b = cache.getOrCreate("b", () => compile([]));
  assert.equal(cache.getOrCreate("a", () => compile([])), a);
  cache.getOrCreate("c", () => compile([]));
  assert.equal(cache.getOrCreate("a", () => compile([])), a);
  assert.notEqual(cache.getOrCreate("b", () => compile([])), b);
});

test("the default cache evicts after 128 distinct subsets", () => {
  const cache = createCompiledCache();
  const first = cache.getOrCreate("0", () => compile([]));
  for (let i = 1; i <= 128; i++) cache.getOrCreate(String(i), () => compile([]));
  assert.notEqual(cache.getOrCreate("0", () => compile([])), first);
});

test("invalid limits and compilation failures do not corrupt retained values", () => {
  for (const limit of [0, -1, 1.5, Infinity, NaN]) assert.throws(() => createCompiledCache(limit), RangeError);
  const cache = createCompiledCache(1);
  const first = cache.getOrCreate("a", () => compile([]));
  assert.throws(() => cache.getOrCreate("b", () => { throw new Error("compile failed"); }), /compile failed/);
  assert.equal(cache.getOrCreate("a", () => compile([])), first);
});
