import assert from "node:assert/strict";
import test from "node:test";

import { packEntries } from "../scripts/npm-pack.ts";

const entry = { name: "deadhead", filename: "deadhead-0.1.0.tgz", files: [{ path: "package.json" }, { path: "dist/index.js" }] };

test("npm 11 prints an array of packed packages", () => {
  assert.deepEqual(packEntries(JSON.stringify([entry])), [entry]);
});

test("npm 12 prints an object keyed by package name", () => {
  assert.deepEqual(packEntries(JSON.stringify({ deadhead: entry })), [entry]);
});
