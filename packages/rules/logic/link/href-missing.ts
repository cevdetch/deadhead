import type { FixableFn } from "../../types.ts";

/**
 * A link with an `id` or a `data-*` attribute is a hook a script fills in:
 * a lazy stylesheet, a theme switch, a head manager's slot. HTML fetches an
 * external resource link "when the href attribute of the link element … is
 * changed", so the element goes live the moment a script sets `href`. It is
 * reported, since the served markup defines no link, but not deleted.
 * https://html.spec.whatwg.org/multipage/semantics.html#link-type-stylesheet
 */
export const fixable: FixableFn = (element) =>
  !element.hasAttr("id") && !element.attrNames().some((name) => name.startsWith("data-"));
