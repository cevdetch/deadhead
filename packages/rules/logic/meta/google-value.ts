import type { ElementPort, FixableFn, MatchFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";

/**
 * The tokens Google documents for `<meta name="google">`: `notranslate`, which
 * Chrome reads to turn its translation offer off, and `nopagereadaloud`, which
 * keeps Google's text-to-speech services from reading the page aloud. Google
 * ignores the rest, including its own retired `nositelinkssearchbox`.
 * https://developers.google.com/search/docs/crawling-indexing/special-tags
 */
const GOOGLE_TOKENS: ReadonlySet<string> = new Set(["notranslate", "nopagereadaloud"]);

/** Google documents no separator for this name; split as robots lists split. */
const SEPARATOR = /[,\t\n\f\r ]+/;

const split = (value: string): string[] =>
  asciiLowercase(value)
    .split(SEPARATOR)
    .filter((token) => token !== "");

const tokens = (element: ElementPort): string[] => split(element.attr("content") ?? "");

/**
 * Chrome's `HasNoTranslate` skips a meta whose name is not `google` in a
 * case-sensitive compare, reads `content` (or `value` when `content` is
 * absent) and requires that whole value to equal `notranslate`, ignoring
 * ASCII case. A tag that means `notranslate` in any other form leaves Chrome's
 * translation offer on: `name="Google"`, `content="notranslate, nopagereadaloud"`,
 * a padded `content=" notranslate"`.
 * https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/exported/web_language_detection_details.cc
 */
const chromeSkipsNoTranslate = (element: ElementPort): boolean => {
  const value = element.attr("content") ?? element.attr("value") ?? "";
  if (!split(value).includes("notranslate")) return false;
  return element.attr("name") !== "google" || asciiLowercase(value) !== "notranslate";
};

/**
 * The selector is only a pre-filter. A tag trips the rule when one of its
 * content tokens is not one Google documents, or when it means `notranslate`
 * in a form Chrome skips. Tags with no `content`, or no tokens in it, stay
 * quiet; Chrome's older `<meta name="google" value="notranslate">` is one.
 */
export const match: MatchFn = (element) =>
  tokens(element).some((token) => !GOOGLE_TOKENS.has(token)) || chromeSkipsNoTranslate(element);

/**
 * `nositelinkssearchbox` switched off a results feature Google removed on
 * 2024-11-21, so a tag carrying it and nothing else has no reader. Dropping it
 * from a mixed value is no fix: Chrome honours `notranslate` only as the whole
 * content, so `nositelinkssearchbox, notranslate` would gain an effect. A tag
 * with no content tokens reports for its `value` form alone and keeps it.
 * https://developers.google.com/search/blog/2024/10/sitelinks-search-box
 */
export const fixable: FixableFn = (element) => {
  const found = tokens(element);
  return found.length > 0 && found.every((token) => token === "nositelinkssearchbox");
};
