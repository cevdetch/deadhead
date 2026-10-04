import type { MatchFn } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * The eight policies, lowercased, plus the four legacy keywords the HTML
 * Standard's referrer metadata name maps onto policies: `never`, `default`,
 * `always` and `origin-when-crossorigin`.
 * https://html.spec.whatwg.org/multipage/semantics.html#meta-referrer
 */
const VALID: ReadonlySet<string> = new Set([
  "no-referrer",
  "no-referrer-when-downgrade",
  "same-origin",
  "origin",
  "strict-origin",
  "origin-when-cross-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url",
  "never",
  "always",
  "default",
  "origin-when-crossorigin",
]);

/**
 * The `meta[name="referrer" i]` selector is only a pre-filter. The field
 * holds a single keyword, so the whole trimmed value has to hit the table
 * above: multi-token and empty values trip like any other unknown token,
 * since browsers honor none of them.
 */
export const match: MatchFn = (element) => {
  const content = element.attr("content");
  if (content === undefined) return false;
  return !VALID.has(stripAsciiWhitespace(content).toLowerCase());
};
