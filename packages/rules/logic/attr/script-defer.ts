import type { MatchFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";
import { isClassicScript, scriptTypeString } from "../../lib/script.ts";

/** The script types HTML schedules on their own terms: `defer` never reaches them. */
const NO_DEFER_TYPES: ReadonlySet<string> = new Set(["module", "importmap", "speculationrules"]);

/**
 * HTML reads `defer` on an external classic script alone, and only when
 * `async` is absent: "If el has an async attribute" comes first in "prepare
 * the script element". A module defers by default, an inline script runs at
 * once, and import maps and speculation rules are processed on the spot.
 * Data blocks stay quiet: HTML leaves them to "author script or other tools".
 * https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer
 */
export const match: MatchFn = (element) => {
  if (isClassicScript(element)) return !element.hasAttr("src") || element.hasAttr("async");
  return NO_DEFER_TYPES.has(asciiLowercase(scriptTypeString(element)));
};
