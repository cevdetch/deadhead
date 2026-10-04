/**
 * Fixes are text edits over byte ranges of the original source. Nothing here
 * ever touches the tree.
 *
 * That is not a stylistic preference. Serialising a parsed document back to
 * HTML rewrites quote style, attribute order, whitespace, void-element
 * spelling and character references across the *entire* file — so a one-line
 * fix arrives as a thousand-line diff, and the tool becomes unusable on any
 * codebase with review. Range edits also make ESLint autofix free, because an
 * ESLint fixer is exactly a range and a replacement string.
 */

import { asciiLower, parseSelector, presenceTests, type TokenTest, tokenTests } from "./selector.ts";
import type { ElementPort, Range } from "./types.ts";
import type { RuleMeta } from "./vocabulary.ts";

export type Fix = { ruleId: string; range: Range; text: string };

const isBlank = (value: string): boolean => /^[ \t]*$/.test(value);

/**
 * Widen an element's range to swallow the whole line when the element sits on
 * one by itself. Without this, deleting `<meta …>` leaves the indentation and
 * the newline behind, and the fix that was supposed to tidy the file adds a
 * blank line to it.
 */
function wholeLineIfAlone(source: string, [start, end]: Range): Range {
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  if (!isBlank(source.slice(lineStart, start))) return [start, end];

  let after = end;
  while (after < source.length && (source[after] === " " || source[after] === "\t")) after++;
  if (after < source.length && source[after] !== "\n") return [start, end];

  return [lineStart, after < source.length ? after + 1 : after];
}

/** ASCII whitespace, which is how HTML splits a token-set attribute. */
const SPACE = /[\t\n\f\r ]+/;

/**
 * The range of an attribute's *value*, inside its quotes.
 *
 * Returning the inside of the delimiter rather than the whole attribute is
 * what lets `remove-token` edit a value without touching quote style — the one
 * thing this project's autofix promises never to do. `null` when the attribute
 * has no quoted value, which for a token-set attribute means it holds at most
 * one token and is handled by the caller.
 */
function quotedValueRange(source: string, [start, end]: Range): Range | null {
  const text = source.slice(start, end);
  const equals = text.indexOf("=");
  if (equals === -1) return null;

  let at = equals + 1;
  while (at < text.length) {
    const ch = text[at];
    if (ch === undefined || !SPACE.test(ch)) break;
    at++;
  }
  const quote = text[at];
  if (quote !== '"' && quote !== "'") return null;

  const close = text.indexOf(quote, at + 1);
  if (close === -1) return null;
  return [start + at + 1, start + close];
}

/** Take the whitespace before an attribute with it, so `<a  b>` never appears. */
function withLeadingSpace(source: string, [start, end]: Range): Range {
  let from = start;
  while (from > 0 && (source[from - 1] === " " || source[from - 1] === "\t")) from--;
  return [from, end];
}

/** Parsed once per rule and attribute: computeFix runs once per finding. */
const TOKEN_TESTS = new Map<string, TokenTest[]>();

function deadTokens(selector: string, attr: string): TokenTest[] {
  const key = `${attr}\u0000${selector}`;
  let tests = TOKEN_TESTS.get(key);
  if (tests === undefined) {
    const parsed = parseSelector(selector);
    tests = parsed.ok ? tokenTests(parsed.ast, attr) : [];
    TOKEN_TESTS.set(key, tests);
  }
  return tests;
}

/** Parsed once per selector: computeFix runs once per finding. */
const PRESENCE_TESTS = new Map<string, string[]>();

function presentAttrs(selector: string): string[] {
  let names = PRESENCE_TESTS.get(selector);
  if (names === undefined) {
    const parsed = parseSelector(selector);
    names = parsed.ok ? presenceTests(parsed.ast) : [];
    PRESENCE_TESTS.set(selector, names);
  }
  return names;
}

/** The attributes that say what a meta is for: each names a different reader. */
const META_KEYS = ["name", "property", "http-equiv", "itemprop", "charset"] as const;

/**
 * The fix for one finding, or `null` when there is not one.
 *
 * Reasons there may be no fix, all of them deliberate:
 * - the rule declares `fix: { op: "none" }`;
 * - `detectability: "partial"`, so the rule is not certain and must never edit
 *   somebody's file on a guess;
 * - the adapter has no source text (the live DOM), so there is no range;
 * - the attribute the rule names is not on this element;
 * - `remove-token` would empty the attribute, which says something different
 *   from what the author wrote.
 * - `remove-tokens` found none of its keywords in the attribute (a
 *   `match: "logic"` rule matched on something else).
 * - `remove-attributes` found none of its selector's `[attr]` tests present
 *   on this element (a `match: "logic"` rule matched on something else).
 * - `remove-element` on a `<meta>` carrying more than one of `META_KEYS`:
 *   removing it would take a live key along with the dead one.
 */
export function computeFix(
  meta: RuleMeta,
  element: ElementPort,
  source: string | null,
): Fix | null {
  if (meta.fix.op === "none") return null;
  // "Possible" findings are reported and never autofixed.
  if (meta.detectability === "partial") return null;
  if (source === null) return null;

  if (meta.fix.op === "remove-element") {
    // A meta that carries two keys answers to two readers. A rule about one
    // key would delete the other with it (`name="application-name"` sharing an
    // element with `property="og:site_name"`), so the finding stays and the fix goes.
    if (element.tag === "meta" && META_KEYS.filter((key) => element.hasAttr(key)).length > 1) return null;
    const range = element.range();
    if (range === null) return null;
    return { ruleId: meta.ruleId, range: wholeLineIfAlone(source, range), text: "" };
  }

  if (meta.fix.op === "remove-attributes") {
    if (meta.selector === null) return null;
    // One fix for all of them: several fixes on one element would overlap
    // once widened to their leading space, and applyFixes would skip all but one.
    const ranges = presentAttrs(meta.selector)
      .map((name) => element.attrRange(name))
      .filter((range): range is Range => range !== null)
      .map((range) => withLeadingSpace(source, range))
      .sort((a, b) => a[0] - b[0]);
    const first = ranges[0];
    if (first === undefined) return null;
    const last = ranges[ranges.length - 1]!;
    // Rebuild the span between the first and last attribute without them.
    let text = "";
    let at = first[0];
    for (const [start, end] of ranges) {
      text += source.slice(at, start);
      at = end;
    }
    return { ruleId: meta.ruleId, range: [first[0], last[1]], text };
  }

  const attr = meta.fix.attr;
  if (attr === null) return null;
  const range = element.attrRange(attr);
  if (range === null) return null;

  if (meta.fix.op === "remove-tokens") {
    // Delete the keywords the selector matched and keep the rest as written.
    // When none survive, the element does nothing, so it goes, the same way
    // remove-element takes it. When none of the tested keywords is in the
    // attribute (an empty value, a `match: "logic"` rule, or another
    // alternative matched), nothing is dead and there is nothing to fix.
    if (meta.selector === null) return null;
    const tests = deadTokens(meta.selector, attr);
    const isDead = (part: string): boolean =>
      tests.some((t) => (t.insensitive ? asciiLower(part) === asciiLower(t.value) : part === t.value));
    const valueRange = quotedValueRange(source, range);
    // No quotes to slice: read the decoded value from the port; character
    // references can still make it several keywords.
    const parts = (valueRange === null ? (element.attr(attr) ?? "") : source.slice(valueRange[0], valueRange[1]))
      .split(SPACE)
      .filter((p) => p !== "");
    const kept = parts.filter((part) => !isDead(part));
    if (kept.length === parts.length) return null; // nothing dead here
    if (kept.length === 0) {
      const whole = element.range();
      return whole === null ? null : { ruleId: meta.ruleId, range: wholeLineIfAlone(source, whole), text: "" };
    }
    // Some survive, but an unquoted value cannot be rewritten without quoting it.
    if (valueRange === null) return null;
    return { ruleId: meta.ruleId, range: valueRange, text: kept.join(" ") };
  }

  if (meta.fix.op === "remove-attribute") {
    return { ruleId: meta.ruleId, range: withLeadingSpace(source, range), text: "" };
  }

  // remove-token: drop one keyword from a whitespace-separated set, leaving
  // every other keyword — and the quoting — exactly as the author wrote it.
  const token = meta.fix.token;
  if (token === null) return null;

  const valueRange = quotedValueRange(source, range);
  if (valueRange === null) return null;

  const value = source.slice(valueRange[0], valueRange[1]);
  const wanted = asciiLower(token);
  const kept = value.split(SPACE).filter((part) => part !== "" && asciiLower(part) !== wanted);

  // Nothing changed: the token was not actually there.
  if (kept.length === value.split(SPACE).filter((part) => part !== "").length) return null;
  // Removing the last keyword would leave an empty attribute, which means
  // something different from what the author wrote. Let them decide.
  if (kept.length === 0) return null;

  return { ruleId: meta.ruleId, range: valueRange, text: kept.join(" ") };
}

export type ApplyResult = {
  output: string;
  applied: Fix[];
  /** Fixes dropped because they overlapped one already applied. */
  skipped: Fix[];
};

/**
 * Splice fixes into the original source.
 *
 * Applied back to front so earlier offsets stay valid, and any fix overlapping
 * one already applied is skipped rather than merged: two rules disagreeing
 * about the same bytes is a conflict, and guessing at a resolution would
 * corrupt the file. The caller re-runs to pick up what was skipped, the way
 * ESLint does.
 */
export function applyFixes(source: string, fixes: Fix[]): ApplyResult {
  const ordered = [...fixes].sort((a, b) => b.range[0] - a.range[0] || b.range[1] - a.range[1]);

  const applied: Fix[] = [];
  const skipped: Fix[] = [];
  let lastStart = Number.POSITIVE_INFINITY;

  const pieces: string[] = [];
  let cursor = source.length;
  for (const fix of ordered) {
    const [start, end] = fix.range;
    if (end > lastStart) {
      skipped.push(fix);
      continue;
    }
    pieces.push(source.slice(end, cursor), fix.text);
    cursor = start;
    applied.push(fix);
    lastStart = start;
  }
  pieces.push(source.slice(0, cursor));

  return { output: pieces.reverse().join(""), applied: applied.reverse(), skipped: skipped.reverse() };
}
