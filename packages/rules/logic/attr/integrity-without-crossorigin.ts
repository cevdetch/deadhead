import type { MatchFn } from "../../types.ts";
import { isClassicScript } from "../../lib/script.ts";
import { asciiLowercase, stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * Cross-origin in shape: an absolute or protocol-relative URL. Markup alone
 * cannot name the page origin, so `https://example.com/app.js` on
 * `https://example.com` reports too — every finding is `possible`.
 *
 * Tabs and newlines are stripped before the check, as the URL parser reads
 * them, and backslashes count as slashes. Relative URLs stay same-origin and
 * never report; `data:` and `blob:` never match the prefixes below.
 */
const isCrossOriginShape = (value: string): boolean => {
  const cleaned = stripAsciiWhitespace(value.replace(/[\t\n\r]/g, ""));
  const url = asciiLowercase(cleaned.replace(/\\/g, "/"));
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
};

/** Whether the `rel` token list holds `modulepreload`, which always fetches in `cors` mode. */
const isModulepreload = (rel: string | undefined): boolean => {
  if (rel === undefined) return false;
  return rel.split(/[\t\n\f\r ]+/).some((token) => asciiLowercase(token) === "modulepreload");
};

export const match: MatchFn = (element) => {
  if (element.hasAttr("crossorigin")) return false;
  if (element.tag === "script") {
    const src = element.attr("src");
    if (src === undefined) return false;
    // Module scripts always fetch in `cors` mode; inline and data blocks fetch nothing.
    if (!isClassicScript(element)) return false;
    return isCrossOriginShape(src);
  }
  const href = element.attr("href");
  if (href === undefined) return false;
  if (isModulepreload(element.attr("rel"))) return false;
  return isCrossOriginShape(href);
};
