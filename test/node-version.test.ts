import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// Cloudflare Pages ignores package.json "engines" and defaults to Node 22.16,
// which cannot run the .ts build scripts that site:build calls. It reads
// .node-version, so that file carries the same major as engines and CI.
test(".node-version pins the Node major that engines and CI require", async () => {
  const pinned = (await read(".node-version")).trim();
  assert.match(pinned, /^\d+$/, ".node-version holds a bare major");
  const engines = /^>=(\d+)\./.exec(JSON.parse(await read("package.json")).engines.node)?.[1];
  assert.equal(pinned, engines, "package.json engines.node");
  const ci = [...(await read(".github/workflows/ci.yml")).matchAll(/node-version: (\d+)/g)].map((m) => m[1]);
  assert.ok(ci.length > 0, "ci.yml sets no node-version");
  for (const major of ci) assert.equal(major, pinned, "ci.yml node-version");
});
