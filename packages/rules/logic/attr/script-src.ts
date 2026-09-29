import type { MatchFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";
import { scriptTypeString } from "../../lib/script.ts";

/** The script types HTML refuses to fetch from `src`. */
const NO_EXTERNAL_TYPES: ReadonlySet<string> = new Set(["importmap", "speculationrules"]);

/**
 * The selector's `*=` lets a padded `type=" importmap "` through; HTML strips
 * ASCII whitespace from the type before matching it, so the exact check sits
 * here. For either type with `src`, "prepare the script element" fires `error`
 * and returns before it reads the URL or the inline text. `importmap-shim`
 * (es-module-shims) fails the exact match and stays quiet.
 * https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element
 */
export const match: MatchFn = (element) => NO_EXTERNAL_TYPES.has(asciiLowercase(scriptTypeString(element)));
