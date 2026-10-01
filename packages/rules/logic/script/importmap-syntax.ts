import type { CheckFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";
import { scriptTypeString } from "../../lib/script.ts";

/** The top-level keys the HTML Standard requires to be JSON objects when present. */
const OBJECT_KEYS = ["imports", "scopes", "integrity"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A document rule so the parser's message can be the finding detail, as in
 * `script/speculationrules-syntax`.
 *
 * "Parse an import map string" throws on bad JSON, on a top level that is not
 * a map, and on `imports`, `scopes` or `integrity` that is not a map; each
 * throw leaves no map registered. HTML strips ASCII whitespace from the type,
 * so `*=` pre-filters and the exact match sits here. A map with `src` belongs
 * to `attr/script-src`: the browser never reads its text.
 * https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string
 */
export const check: CheckFn = (doc, ctx) =>
  doc.querySelectorAll('script[type*="importmap" i]').flatMap((element) => {
    if (element.hasAttr("src") || asciiLowercase(scriptTypeString(element)) !== "importmap") return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(element.text());
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return [ctx.report(element, { detail })];
    }
    if (!isObject(parsed)) return [ctx.report(element, { detail: "top-level value is not a JSON object" })];
    const key = OBJECT_KEYS.find((name) => name in parsed && !isObject(parsed[name]));
    return key === undefined ? [] : [ctx.report(element, { detail: `"${key}" is not a JSON object` })];
  });
