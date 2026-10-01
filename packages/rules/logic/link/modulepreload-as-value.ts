import type { MatchFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";

/**
 * Fetch destinations (and `fetch`, the `as` keyword for the empty one) that
 * are not module preload destinations: "json", "style", "text", or a
 * script-like destination. A value outside every list is in no state, which
 * HTML maps to "script", so it stays quiet.
 * https://html.spec.whatwg.org/multipage/links.html#module-preload-destination
 */
const NON_MODULE: ReadonlySet<string> = new Set([
  "audio",
  "document",
  "embed",
  "fetch",
  "font",
  "frame",
  "iframe",
  "image",
  "manifest",
  "object",
  "report",
  "track",
  "video",
  "webidentity",
  "xslt",
]);

/**
 * HTML fires `error` at a modulepreload whose destination is not a module
 * preload destination, and fetches nothing for it. `as` is an enumerated
 * attribute: matched without regard to ASCII case, and not trimmed.
 */
export const match: MatchFn = (element) => NON_MODULE.has(asciiLowercase(element.attr("as") ?? ""));
