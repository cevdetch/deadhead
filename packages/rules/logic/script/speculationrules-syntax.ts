import type { CheckFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";
import { scriptTypeString } from "../../lib/script.ts";

/**
 * A document rule for the same reason as `script/json-ld-syntax`: the
 * parser's message is the finding detail, and only `ctx.report` carries one.
 *
 * The HTML Standard's "parse a speculation rule set string" parses the text
 * as JSON and throws a TypeError when the result is not a map; either throw
 * drops the whole set. HTML strips ASCII whitespace from the type, so `*=`
 * pre-filters and the exact match sits here. A set with `src` belongs to
 * `attr/script-src`: the browser never reads its text.
 * https://html.spec.whatwg.org/multipage/speculative-loading.html
 */
export const check: CheckFn = (doc, ctx) =>
  doc.querySelectorAll('script[type*="speculationrules" i]').flatMap((element) => {
    if (element.hasAttr("src") || asciiLowercase(scriptTypeString(element)) !== "speculationrules") return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(element.text());
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return [ctx.report(element, { detail })];
    }
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return [];
    return [ctx.report(element, { detail: "top-level value is not a JSON object" })];
  });
