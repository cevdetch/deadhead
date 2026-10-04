import type { MatchFn } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * The values no engine acts on. Firefox applies the pragma only while
 * prefetching is still allowed, and then keeps it allowed for an empty value
 * or `on` (case-insensitive, untrimmed) and turns it off for anything else:
 * `on` never turns it back on. Chromium sets a flag that nothing reads but a
 * child frame's copy of it. So `on`, an empty value and a missing `content`
 * are inert, and every other value is a Firefox opt-out, left alone.
 * https://hg.mozilla.org/mozilla-central/file/11022e1a677f0dd83f348d52bd2b17c8410e3fab/dom/base/Document.cpp
 */
const INERT: ReadonlySet<string> = new Set(["", "on"]);

/** The selector is a pre-filter; the verdict is the content value, untrimmed as both engines read it. */
export const match: MatchFn = (element) => {
  const httpEquiv = element.attr("http-equiv");
  if (httpEquiv === undefined) return false;
  if (stripAsciiWhitespace(httpEquiv).toLowerCase() !== "x-dns-prefetch-control") return false;
  const content = element.attr("content");
  return content === undefined || INERT.has(content.toLowerCase());
};
