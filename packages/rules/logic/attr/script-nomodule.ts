import type { FixableFn, MatchFn } from "../../types.ts";
import { isClassicScript } from "../../lib/script.ts";

/**
 * HTML "prepare the script element" returns for a classic script with
 * `nomodule`, before the CSP check and before any fetch. On a module script,
 * an import map, speculation rules or a data block the attribute changes
 * nothing, and the fix there removes the attribute, not the element.
 * https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element
 */
export const match: MatchFn = (element) => isClassicScript(element);

/**
 * An `id` is a handle another script can read the element by. Vite's
 * plugin-legacy does: in a browser that fails its modern check, a module
 * script reads the `src` of `#vite-legacy-polyfill` and the `data-src` of
 * `#vite-legacy-entry`, so deleting either breaks the page there.
 * https://github.com/vitejs/vite/blob/main/packages/plugin-legacy/src/snippets.ts
 */
export const fixable: FixableFn = (element) => !element.hasAttr("id");
