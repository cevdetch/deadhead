import type { MatchFn } from "../../types.ts";
import { trimUrl } from "../../lib/url.ts";

/**
 * `as="font"` on a stylesheet URL (a path ending in `.css`, or the Google
 * Fonts CSS API) is a mislabelled preload, not a font fetch: adding
 * `crossorigin` would not make it match the stylesheet request.
 */
const isStylesheetUrl = (href: string): boolean => {
  const path = trimUrl(href).split(/[?#]/)[0] ?? "";
  return /\.css$/i.test(path) || /^(?:https?:)?\/\/fonts\.googleapis\.com\/css2?$/i.test(path);
};

export const match: MatchFn = (element) => !isStylesheetUrl(element.attr("href") ?? "");
