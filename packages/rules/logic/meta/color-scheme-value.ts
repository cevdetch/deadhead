import type { MatchFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";

/** A CSS escape: a backslash and the character after it, a newline excepted. */
const ESCAPE = String.raw`\\[^\n\r\f]`;

/** A CSS identifier token, per CSS Syntax: `--`, or an optional `-` and a name-start code point, then name code points. */
const IDENT = new RegExp(
  String.raw`^(?:--|-?(?:[a-zA-Z_\u0080-\u{10FFFF}]|${ESCAPE}))(?:[\w\-\u0080-\u{10FFFF}]|${ESCAPE})*$`,
  "u",
);

/**
 * Words CSS Values bars from `<custom-ident>`: the CSS-wide keywords and
 * `default`. Chromium accepts a CSS-wide keyword alone in the meta and Firefox
 * skips it; none names a scheme, so every position reports.
 * https://drafts.csswg.org/css-values-4/#custom-idents
 */
const RESERVED: ReadonlySet<string> = new Set(["initial", "inherit", "unset", "revert", "revert-layer", "default"]);

/**
 * HTML keeps the first `color-scheme` meta whose content "is a valid CSS
 * 'color-scheme' property value": `normal | [ light | dark | <custom-ident> ]+
 * && only?`. `normal` stands alone; `only` appears once, before or after at
 * least one scheme. A repeated scheme and an unknown identifier are valid.
 * https://html.spec.whatwg.org/multipage/semantics.html#meta-color-scheme
 * https://drafts.csswg.org/css-color-adjust-1/#color-scheme-prop
 */
export const match: MatchFn = (element) => {
  const tokens = (element.attr("content") ?? "").split(/[\t\n\f\r ]+/).filter((token) => token !== "");
  if (tokens.length === 0 || !tokens.every((token) => IDENT.test(token))) return true;
  const keywords = tokens.map(asciiLowercase);
  if (keywords.some((keyword) => RESERVED.has(keyword))) return true;
  if (keywords.includes("normal")) return keywords.length !== 1;
  const only = keywords.filter((keyword) => keyword === "only").length;
  if (only === 0) return false;
  if (only > 1 || keywords.length === 1) return true;
  return keywords[0] !== "only" && keywords.at(-1) !== "only";
};
