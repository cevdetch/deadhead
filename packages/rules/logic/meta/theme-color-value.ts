import type { MatchFn } from "../../types.ts";
import { asciiLowercase, stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * A bare word passes as a color: CSS Color 4 names 192 of them (named, system
 * and deprecated system colors), and the list costs the bookmarklet 2.2 kB, so
 * `blu` goes unreported. These words are never a `<color>`: the CSS-wide
 * keywords have no cascade to draw on in a meta, `default` is reserved, and
 * `none` is no color. No color word is spelled with hex digits alone, so a
 * word that is 3, 4, 6 or 8 of them is a hex color missing its `#`.
 * https://drafts.csswg.org/css-color-4/#named-colors
 */
const NOT_COLORS: ReadonlySet<string> = new Set(["inherit", "initial", "unset", "revert", "revert-layer", "default", "none"]);

/** A CSS identifier without escapes, after ASCII lowercasing. */
const IDENT = /^-?[a-z_][a-z0-9_-]*$/;

/** The color functions Chromium 153 and Firefox 159 both parse. `device-cmyk()` parses in neither. */
const COLOR_FUNCTIONS: ReadonlySet<string> = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "color-mix",
  "light-dark",
  "contrast-color",
]);

const HEX_DIGITS = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const FUNCTION = /^([a-z-]+)\(([^]*)$/;
const COMMENT = /\/\*[^]*?(?:\*\/|$)/g;

/**
 * Whether the arguments close the function at most once, at the very end. CSS
 * closes a function left open at the end of input, so `rgb(0 0 0` parses.
 * The arguments themselves go unchecked: `rgb(300 0)` passes here.
 */
function wellFormedArguments(rest: string): boolean {
  let depth = 1;
  for (let index = 0; index < rest.length; index++) {
    if (rest[index] === "(") depth++;
    else if (rest[index] === ")" && --depth === 0) return index === rest.length - 1 && rest.slice(0, index).trim() !== "";
  }
  return rest.trim() !== "";
}

/**
 * HTML strips ASCII whitespace from `content` and parses the rest as a CSS
 * `<color>`, with no cascade: `var()`, `inherit` and `initial` fail
 * there, although `CSS.supports` accepts them in a stylesheet.
 * https://html.spec.whatwg.org/multipage/semantics.html#meta-theme-color
 * https://drafts.csswg.org/css-color-4/#parse-a-css-color-value
 */
export const match: MatchFn = (element) => {
  const value = asciiLowercase(stripAsciiWhitespace((element.attr("content") ?? "").replace(COMMENT, " ")));
  if (value.startsWith("#")) return !HEX_DIGITS.test(value.slice(1));
  if (IDENT.test(value)) return NOT_COLORS.has(value) || HEX_DIGITS.test(value);
  const call = FUNCTION.exec(value);
  return !call || !COLOR_FUNCTIONS.has(call[1] ?? "") || !wellFormedArguments(call[2] ?? "");
};
