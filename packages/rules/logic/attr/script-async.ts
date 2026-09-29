import type { MatchFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";
import { isClassicScript, scriptTypeString } from "../../lib/script.ts";

/** Script types processed on the spot, where `async` has nothing to schedule. */
const NO_ASYNC_TYPES: ReadonlySet<string> = new Set(["importmap", "speculationrules"]);

/**
 * The selector keeps scripts without `src`. HTML's async branch runs for a
 * classic script with `src` or a module, so an inline classic script, an import
 * map and speculation rules never read the attribute. An inline module does:
 * `async` runs it as soon as its imports load. Data blocks stay quiet.
 * https://html.spec.whatwg.org/multipage/scripting.html#attr-script-async
 */
export const match: MatchFn = (element) =>
  isClassicScript(element) || NO_ASYNC_TYPES.has(asciiLowercase(scriptTypeString(element)));
