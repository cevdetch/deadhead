import type { FixableFn } from "../../types.ts";

/**
 * The `maxLength` IDL attribute reflects `maxlength` on every input type, so
 * `this.value.slice(0, this.maxLength)` caps a number input that the browser
 * itself leaves uncapped. A number input carrying `maxlength` keeps it; `size`
 * alone has no reader and goes.
 * https://html.spec.whatwg.org/multipage/input.html#dom-input-maxlength
 */
export const fixable: FixableFn = (element) => !element.hasAttr("maxlength");
