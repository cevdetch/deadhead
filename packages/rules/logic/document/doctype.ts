import type { CheckFn, DoctypePort } from "../../types.ts";

/**
 * The one system identifier the HTML Standard still permits, for generators
 * that cannot emit the short doctype. Compared case-sensitively: the spec
 * matches the quoted part literally.
 * https://html.spec.whatwg.org/multipage/syntax.html#doctype-legacy-string
 */
const LEGACY_COMPAT = "about:legacy-compat";

/**
 * What is wrong with a doctype, in the terms of the parser's own parse-error
 * test, or `null` when it conforms.
 * https://html.spec.whatwg.org/multipage/parsing.html#the-initial-insertion-mode
 *
 * The rendering mode is deliberately not computed. Doing so means embedding
 * the parser's list of legacy public identifiers, and the port reports a
 * missing identifier and an empty one identically, which that list treats
 * differently. The detail names the offending parts instead.
 */
export function problems(doctype: DoctypePort): string | null {
  const found: string[] = [];
  if (doctype.name !== "html") found.push(doctype.name === "" ? "no name" : `name "${doctype.name}"`);
  if (doctype.publicId !== "") found.push(`public identifier "${doctype.publicId}"`);
  if (doctype.systemId !== "" && doctype.systemId !== LEGACY_COMPAT) {
    found.push(`system identifier "${doctype.systemId}"`);
  }
  return found.length === 0 ? null : found.join(", ");
}

/**
 * A document rule because "the document has no doctype" is not something a
 * selector can match, and the doctype is not an element.
 *
 * A missing doctype is reported on `<html>`, which is where the reader has to
 * add one. The port already drops a doctype the tree builder would ignore, so
 * one that follows text or an element counts as missing, as it does in a
 * browser.
 */
export const check: CheckFn = (doc, ctx) => {
  const doctype = doc.doctype();
  if (doctype === null) {
    const root = doc.querySelector("html");
    return root === null ? [] : [ctx.report(root, { detail: "no doctype; the page renders in quirks mode" })];
  }
  const detail = problems(doctype);
  return detail === null ? [] : [ctx.report(doctype, { detail })];
};
