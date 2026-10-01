#!/usr/bin/env node
/**
 * Bundle the two published packages. Node will not strip types under
 * node_modules, so what ships is JavaScript: ESM entries with core and rules
 * inlined and runtime dependencies external. Types come from the source:
 * rolldown-plugin-dts with oxc's isolated declarations writes one index.d.ts
 * per package from its public entry.
 */

import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { styleText } from "node:util";
import { rolldown } from "rolldown";
import { dts } from "rolldown-plugin-dts";

import { ROOT } from "./rules-source.ts";

type Target = { dir: string; entries: Record<string, string>; external: RegExp[] };

const TARGETS: Target[] = [
  {
    dir: "packages/cli",
    entries: { deadhead: "bin/deadhead.ts", index: "index.ts", worker: "worker.ts" },
    external: [/^node:/, /^parse5(\/|$)/],
  },
  {
    dir: "packages/eslint-plugin",
    entries: { index: "index.ts" },
    external: [/^node:/, /^@html-eslint\/parser(\/|$)/, /^eslint(\/|$)/],
  },
];

for (const target of TARGETS) {
  const src = resolve(ROOT, target.dir);
  const out = resolve(src, "dist");
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  // JavaScript. Shared chunks stay at the dist root: the CLI finds worker.js
  // and ../package.json relative to import.meta.url, wherever that code lands.
  const input = Object.fromEntries(Object.entries(target.entries).map(([name, file]) => [name, resolve(src, file)]));
  const js = await rolldown({ input, external: target.external, platform: "node" });
  await js.write({ dir: out, format: "esm", entryFileNames: "[name].js", chunkFileNames: "[name]-[hash].js" });
  await js.close();

  // Types, from the public entry alone. isolatedDeclarations selects the oxc
  // generator: no TypeScript program, and any export without an explicit
  // type fails the build (TS9010) instead of shipping a wrong declaration.
  const types = await rolldown({
    input: { index: resolve(src, "index.ts") },
    external: target.external,
    platform: "node",
    plugins: [dts({ emitDtsOnly: true, tsconfig: false, compilerOptions: { isolatedDeclarations: true, declaration: true } })],
  });
  await types.write({ dir: out, format: "esm" });
  await types.close();

  await copyFile(resolve(ROOT, "LICENSE"), resolve(out, "LICENSE"));
  process.stdout.write(`${styleText("green", "✓")} ${target.dir}/dist\n`);
}
