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

const tokens = (element: ElementPort): string[] =>
  asciiLowercase(element.attr("content") ?? "")
    .split(SEPARATOR)
    .filter((token) => token !== "");

/**
 * The selector is only a pre-filter. A tag trips the rule when one of its
 * content tokens is not one Google documents. Tags with no `content`, or no
 * tokens in it, stay quiet; Chrome's older `value="notranslate"` is one.
 */
export const match: MatchFn = (element) => tokens(element).some((token) => !GOOGLE_TOKENS.has(token));

/**
 * `nositelinkssearchbox` switched off a results feature Google removed on
 * 2024-11-21, so a tag carrying it and nothing else has no reader. Dropping it
 * from a mixed value is no fix: Chrome honours `notranslate` only as the whole
 * content, so `nositelinkssearchbox, notranslate` would gain an effect.
 * https://developers.google.com/search/blog/2024/10/sitelinks-search-box
 */
export const fixable: FixableFn = (element) =>
  tokens(element).every((token) => token === "nositelinkssearchbox");
