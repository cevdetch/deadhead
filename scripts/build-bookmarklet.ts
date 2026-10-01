#!/usr/bin/env node
/**
 * Bundle the browser build into one self-contained IIFE.
 *
 * Rolldown does the bundling and minifying: the module graph here is our own
 * uniform ESM+TS, which is exactly what it eats natively, and it belongs to
 * the same toolchain family as the site (Vite 8 runs on rolldown), so this
 * is one dependency pulling in one direction rather than two. The hand-rolled
 * bundler and minifier this replaces are gone; what remains is the part no
 * bundler can do, assembling the rule set.
 *
 * Two properties the output must keep:
 *
 * - **No `fetch`, no `import()`.** Everything, including the rule literals
 *   and the logic modules, is inlined. A page with a strict
 *   Content-Security-Policy is exactly the kind worth inspecting, and it must
 *   not be able to block this.
 * - **Findings come back out.** The entry re-exports `start` and every logic
 *   entry point under a single `__deadhead` global, and the build appends one
 *   `__deadhead.start(payload, logic)` call with the rule set gzipped inside.
 *   The snippet's completion value is the findings promise, which is what the
 *   conformance suite awaits and executes against.
 *   (An IIFE tail `return` would be the obvious shape, but oxc-family
 *   compress drops it as unused — the appended call survives every minifier.)
 *
 * Emits `packages/browser/bookmarklet.js`, which doubles as the devtools
 * snippet — paste it into Sources → Snippets and run. The `javascript:` URL is
 * printed for the bookmark itself.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { styleText } from "node:util";
import { gzipSync } from "node:zlib";
import { rolldown } from "rolldown";

import type { RuleMeta } from "../packages/core/vocabulary.ts";
import { bookmarkletUrl, MAX_URL_BYTES } from "../packages/browser/bookmarklet-url.ts";
import { ROOT, rel } from "./rules-source.ts";

const ENTRY = resolve(ROOT, "packages/browser/bookmarklet.ts");
const RULES_JSON = resolve(ROOT, "packages/rules/rules.json");
const OUT = resolve(ROOT, "packages/browser/bookmarklet.js");
/** The one page-global the snippet leaves behind. Double runs redeclare it. */
export const GLOBAL = "__deadhead";

/**
 * Exactly the keys the bookmarklet reads: the engine dispatches on selector,
 * kind, scope and match, and reports ruleId, severity, description and
 * detectability. The rest (title, pubDate, status, standardsBasis, tags,
 * impacts, related) is prose and site data that would ride the javascript:
 * URL unread; `fix` feeds `computeFix` alone, which the bookmarklet swaps for
 * a stub. `replacement` stays on the rule page each finding links to: it was
 * a third of the payload (10.9 kB of 29.3) against the browsers' 64 kB cap.
 */
export const SLIM_KEYS = [
  "ruleId",
  "description",
  "severity",
  "detectability",
  "kind",
  "scope",
  "selector",
  "match",
] as const;

export type SlimMeta = Pick<RuleMeta, (typeof SLIM_KEYS)[number]>;

export function toSlimMeta(meta: RuleMeta): SlimMeta {
  return {
    ruleId: meta.ruleId,
    description: meta.description,
    severity: meta.severity,
    detectability: meta.detectability,
    kind: meta.kind,
    scope: meta.scope,
    selector: meta.selector,
    match: meta.match,
  };
}

/** Which logic entry a rule wires, following its kind. */
export function logicEntryFor(meta: RuleMeta): "check" | "match" {
  return meta.kind === "document" ? "check" : "match";
}

/** Whether a rule declares a logic module. */
export function needsLogic(meta: RuleMeta): boolean {
  return meta.match === "logic" || meta.kind === "document";
}

/**
 * Whether the rule's logic module exports the entry its kind runs. An element
 * module may export only `fixable`, which vetoes fixes; the DOM has no source
 * text and never fixes, so that rule runs on its selector alone and nothing
 * of the module is inlined.
 */
export async function exportsEntry(meta: RuleMeta): Promise<boolean> {
  const file = resolve(ROOT, "packages/rules/logic", `${meta.ruleId}.ts`);
  const module: Record<string, unknown> = await import(pathToFileURL(file).href);
  return typeof module[logicEntryFor(meta)] === "function";
}

export function logicVarName(meta: RuleMeta): string {
  return `${logicEntryFor(meta)}_${meta.ruleId.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

const ENTRY_ID = "\0deadhead-bookmarklet-entry";
const NO_FIX_ID = "\0deadhead-no-fix";
const ENGINE_SUFFIX = join("packages", "core", "engine.ts");

/** The bookmarklet for a rule set, bundled in memory. No file is written. */
export async function bundleBookmarklet(rules: RuleMeta[]): Promise<string> {
  const toImport = (file: string): string => JSON.stringify(file.replace(/\\/g, "/"));
  const imports = [`import { start } from ${toImport(ENTRY)};`];
  const logicPairs: string[] = [];
  for (const meta of rules) {
    // A module exporting only `fixable` inlines nothing; `start` runs that
    // rule on its selector alone.
    if (!needsLogic(meta) || !(await exportsEntry(meta))) continue;
    const file = resolve(ROOT, "packages/rules/logic", `${meta.ruleId}.ts`);
    const name = logicVarName(meta);
    imports.push(`import { ${logicEntryFor(meta)} as ${name} } from ${toImport(file)};`);
    logicPairs.push(`${JSON.stringify(meta.ruleId)}: ${name}`);
  }
  const payload = gzipSync(JSON.stringify(rules.map(toSlimMeta)), { level: 9 }).toString("base64");
  const entryCode = `${imports.join("\n")}\nexport const logic = { ${logicPairs.join(", ")} };\nexport { start };\n`;

  const built = await rolldown({
    input: ENTRY_ID,
    plugins: [
      {
        name: "deadhead-entry",
        resolveId: (id) => (id === ENTRY_ID ? ENTRY_ID : null),
        load: (id) => (id === ENTRY_ID ? entryCode : null),
      },
      {
        // The live DOM has no source text, so `computeFix` returns null there
        // and `start` never asks for fixes. Swapping the module for a stub
        // keeps its 3 kB of range arithmetic off the javascript: URL.
        name: "deadhead-no-fix",
        resolveId: (id, importer) =>
          id === "./fix.ts" && importer !== undefined && importer.endsWith(ENGINE_SUFFIX) ? NO_FIX_ID : null,
        load: (id) => (id === NO_FIX_ID ? "export const computeFix = () => null;\n" : null),
      },
    ],
  });
  const { output } = await built.generate({ format: "iife", name: GLOBAL, minify: true });
  await built.close();
  const chunk = output[0];
  if (chunk === undefined || !("code" in chunk)) throw new Error("rolldown emitted no chunk");

  return `/* deadhead bookmarklet — generated by scripts/build-bookmarklet.ts. Do not edit.
 * ${rules.length} rule(s) inlined as gzip. No network access, no eval, no inline style: a page's CSP and Trusted Types cannot block it.
 * Paste into devtools → Sources → Snippets, or use the javascript: URL. */
${chunk.code.trimEnd()}
${GLOBAL}.start(${JSON.stringify(payload)}, ${GLOBAL}.logic);
`;
}

if (import.meta.main) {
  const { rules } = JSON.parse(await readFile(RULES_JSON, "utf8")) as { rules: RuleMeta[] };
  const bundle = await bundleBookmarklet(rules);
  await writeFile(OUT, bundle, "utf8");
  const url = bookmarkletUrl(bundle);
  const bytes = Buffer.byteLength(url);
  if (bytes > MAX_URL_BYTES) {
    process.stderr.write(
      `${styleText("red", "error")} bookmarklet URL is ${(bytes / 1024).toFixed(1)} kB, over the ${(MAX_URL_BYTES / 1024).toFixed(0)} kB cap Firefox and Safari enforce.\n`,
    );
    process.exit(1);
  }
  process.stdout.write(
    `${styleText("green", "✓")} ${rules.length} rule(s) → ${rel(OUT)}\n` +
      `  snippet: paste the file into devtools → Sources → Snippets\n` +
      `  bookmarklet URL: ${(bytes / 1024).toFixed(1)} kB\n`,
  );
}
