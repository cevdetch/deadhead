import type { MatchFn } from "../../types.ts";

/** ASCII whitespace, as the HTML Standard defines it. */
const WHITESPACE = "\\t\\n\\f\\r ";

/**
 * The eight keys MDN plus the CSS Viewport Module define, and `shrink-to-fit`,
 * which WebKit parses (`ViewportArguments.cpp`) and applies through
 * `allowsShrinkToFit` (`ViewportConfiguration.cpp`). Chromium ignores it.
 */
const VALID_KEYS = new Set([
  "width",
  "height",
  "initial-scale",
  "minimum-scale",
  "maximum-scale",
  "user-scalable",
  "shrink-to-fit",
  "interactive-widget",
  "viewport-fit",
]);

/**
 * `content` is a list of `key=value` pairs. Comma is the documented separator,
 * semicolon has been accepted by some engines, and Chromium also splits on
 * whitespace — so all three separate pairs, and whitespace around `=` is folded
 * away first so `width = device-width` still reads as one pair. Keys compare
 * in any letter case and, as in Chromium, a later pair overrides an earlier one.
 * https://drafts.csswg.org/css-viewport/
 *
 * Bare tokens (no `=`) never set a value in engines: they are ignored. They
 * still matter here when they name an unknown key (`minimal-ui` alone) or when
 * a known key appears only bare (`width` alone, with no value anywhere).
 */
const parseViewport = (
  content: string,
): { pairs: Map<string, string>; bare: Set<string> } => {
  const pairs = new Map<string, string>();
  const bare = new Set<string>();
  const folded = content.replace(new RegExp(`[${WHITESPACE}]*=[${WHITESPACE}]*`, "g"), "=");
  for (const token of folded.split(new RegExp(`[${WHITESPACE},;]+`))) {
    if (token === "") continue;
    const eq = token.indexOf("=");
    if (eq <= 0) {
      if (eq < 0) bare.add(token.toLowerCase());
      continue;
    }
    pairs.set(token.slice(0, eq).toLowerCase(), token.slice(eq + 1));
  }
  return { pairs, bare };
};

/** Entire value is a number with no trailing junk; `NaN` when it is not. */
const strictNumber = (value: string): number => {
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) === false) return Number.NaN;
  return Number(value);
};

/** `device-width` or a whole number from 1 to 10000. */
const isValidLength = (value: string, keyword: string): boolean => {
  if (value.toLowerCase() === keyword) return true;
  if (/^\d+$/.test(value) === false) return false;
  const number = Number(value);
  return number >= 1 && number <= 10000;
};

/**
 * A value the engines read as a switch: `yes`, `no`, `device-width`,
 * `device-height` or a number (Chromium's `ParseViewportValueAsZoom`, WebKit's
 * `findBooleanValue`). Whether it blocks zoom is `meta/viewport-user-scalable`'s call.
 */
const isSwitch = (value: string): boolean =>
  ["yes", "no", "device-width", "device-height"].includes(value.toLowerCase()) || Number.isNaN(strictNumber(value)) === false;

/** A number from 0.0 to 10.0 with no trailing junk. */
const isValidScale = (value: string): boolean => {
  const number = strictNumber(value);
  return Number.isNaN(number) === false && number >= 0 && number <= 10;
};

/**
 * The selector finds every viewport; this decides whether a key or value
 * falls outside the documented form. There is no fix: the problem is one pair
 * inside `content`, and deleting the element would break the mobile layout the
 * rest of the value sets up.
 *
 * `maximum-scale` skips `yes` and `no`: `meta/viewport-user-scalable` owns
 * those zoom-blocking tokens. `user-scalable` and `shrink-to-fit` report a
 * value that is no switch; the zoom rule also reports unknown values there
 * as disabling.
 */
export const match: MatchFn = (element) => {
  const content = element.attr("content");
  if (content === undefined) return false;
  const { pairs, bare } = parseViewport(content);

  for (const key of pairs.keys()) {
    if (VALID_KEYS.has(key) === false) return true;
  }
  for (const key of bare) {
    if (VALID_KEYS.has(key) === false) return true;
  }

  const width = pairs.get("width");
  if (width !== undefined && isValidLength(width, "device-width") === false) return true;
  if (width === undefined && bare.has("width")) return true;

  const height = pairs.get("height");
  if (height !== undefined && isValidLength(height, "device-height") === false) return true;
  if (height === undefined && bare.has("height")) return true;

  const initialScale = pairs.get("initial-scale");
  if (initialScale !== undefined && isValidScale(initialScale) === false) return true;
  if (initialScale === undefined && bare.has("initial-scale")) return true;

  const minimumScale = pairs.get("minimum-scale");
  if (minimumScale !== undefined && isValidScale(minimumScale) === false) return true;
  if (minimumScale === undefined && bare.has("minimum-scale")) return true;

  const maximumScale = pairs.get("maximum-scale");
  if (maximumScale !== undefined) {
    const keyword = maximumScale.toLowerCase();
    if (keyword !== "yes" && keyword !== "no" && isValidScale(maximumScale) === false) return true;
  }
  if (maximumScale === undefined && bare.has("maximum-scale")) return true;

  const userScalable = pairs.get("user-scalable");
  if (userScalable !== undefined && isSwitch(userScalable) === false) return true;
  if (userScalable === undefined && bare.has("user-scalable")) return true;

  const shrinkToFit = pairs.get("shrink-to-fit");
  if (shrinkToFit !== undefined && isSwitch(shrinkToFit) === false) return true;
  if (shrinkToFit === undefined && bare.has("shrink-to-fit")) return true;

  const interactiveWidget = pairs.get("interactive-widget");
  if (interactiveWidget !== undefined) {
    const keyword = interactiveWidget.toLowerCase();
    if (
      keyword !== "resizes-visual" &&
      keyword !== "resizes-content" &&
      keyword !== "overlays-content"
    ) {
      return true;
    }
  }
  if (interactiveWidget === undefined && bare.has("interactive-widget")) return true;

  const viewportFit = pairs.get("viewport-fit");
  if (viewportFit !== undefined) {
    const keyword = viewportFit.toLowerCase();
    if (keyword !== "auto" && keyword !== "contain" && keyword !== "cover") return true;
  }
  if (viewportFit === undefined && bare.has("viewport-fit")) return true;

  return false;
};
