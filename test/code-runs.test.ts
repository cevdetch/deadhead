import assert from "node:assert/strict";
import test from "node:test";
import { codeRuns } from "../site/src/lib/code-runs.ts";

test("codeRuns: markup in advice text sits at odd indices, prose at even ones", () => {
  assert.deepEqual(codeRuns('Write high, low or auto: <img src="/hero.jpg" fetchpriority="high">.'), [
    "Write high, low or auto: ",
    '<img src="/hero.jpg" fetchpriority="high">',
    ".",
  ]);
  assert.deepEqual(codeRuns("Use <title> and <meta name=\"description\">."), [
    "Use ",
    "<title>",
    " and ",
    '<meta name="description">',
    ".",
  ]);
});

test("codeRuns: prose without markup is one run, and a lone < is prose", () => {
  assert.deepEqual(codeRuns("Delete it."), ["Delete it."]);
  assert.deepEqual(codeRuns("Keep maximum-scale at 2 or more, never < 2."), ["Keep maximum-scale at 2 or more, never < 2."]);
});

test("codeRuns: joined back, the runs are the original text", () => {
  const text = 'Drop the shortcut token: <link rel="icon" href="/favicon.ico">. Keep <script type="module">.';
  assert.equal(codeRuns(text).join(""), text);
});
