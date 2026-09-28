import type { CheckFn, ElementPort } from "../../types.ts";
import { asciiLowercase, stripAsciiWhitespace } from "../../lib/text.ts";

/** Whitespace-separated tokens, as `~=` matches them: ASCII whitespace splits, empty items drop. */
const tokens = (value: string): string[] => value.split(/[\t\n\f\r ]+/).filter((token) => token !== "");

/**
 * A `preload` keyword in `rel`, ASCII case-insensitive. `modulepreload` is a
 * separate token and never matches, so a correct `modulepreload` stays silent.
 */
const isPreload = (element: ElementPort): boolean => {
  const rel = element.attr("rel");
  if (rel === undefined) return false;
  return tokens(rel).some((token) => asciiLowercase(token) === "preload");
};

/** `as` names the `script` destination, ASCII case-insensitive, compared whole. */
const isScriptDestination = (element: ElementPort): boolean => {
  const as = element.attr("as");
  if (as === undefined) return false;
  return asciiLowercase(as) === "script";
};

/** A module script: `type` is an ASCII case-insensitive match for `module`. */
const isModuleScript = (element: ElementPort): boolean => {
  const type = element.attr("type");
  if (type === undefined) return false;
  return asciiLowercase(type) === "module";
};

/**
 * No selector can pair a preload with the module script it names, which is
 * what makes this a `kind: "document"` rule: the scan collects every module `script src` in the
 * document, then reports each `preload as=script` whose `href` is the same
 * string after trimming ASCII whitespace.
 *
 * Three deliberate limits, all from the filed issue:
 *
 * - `crossorigin` on the preload changes nothing. Firefox fetches twice with
 *   it, the same as without it, so the rule reports either way.
 * - `href` and `src` compare as strings. Spellings of one file that differ
 *   as strings (`/app.js` against `./app.js`) do not match, and neither does
 *   anything a `<base href>` would resolve apart.
 * - No source offsets are read, so the CLI, the bookmarklet and the ESLint
 *   plugin agree outright: nothing here is source-dependent.
 */
export const check: CheckFn = (doc, ctx) => {
  const sources = new Set<string>();
  for (const script of doc.querySelectorAll("script")) {
    if (!isModuleScript(script)) continue;
    const src = script.attr("src");
    if (src === undefined) continue;
    sources.add(stripAsciiWhitespace(src));
  }
  if (sources.size === 0) return [];

  const findings = [];
  for (const link of doc.querySelectorAll("link")) {
    if (!isPreload(link) || !isScriptDestination(link)) continue;
    const href = link.attr("href");
    if (href === undefined) continue;
    const target = stripAsciiWhitespace(href);
    if (!sources.has(target)) continue;
    findings.push(ctx.report(link, { detail: `href "${target}" is the src of a module script` }));
  }
  return findings;
};
