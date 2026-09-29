import type { CheckFn, ElementPort } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * A `title` inside `<svg>` is SVG's own element, the accessible name of a
 * drawing, and not the document's title. The port carries no namespace, so
 * the ancestor chain tells the two apart: the HTML parser creates an SVG
 * `title` for any `title` start tag inside `<svg>`.
 */
const insideSvg = (element: ElementPort): boolean => {
  for (let node = element.parent(); node !== null; node = node.parent()) {
    if (node.tag === "svg") return true;
  }
  return false;
};

/**
 * No selector can count head titles, which is what makes this a
 * `kind: "document"` rule rather than an element rule with a logic refinement.
 *
 * Three cases, one finding each: a head with no `title` reports the `head`
 * itself (there is no element to point at); each `title` past the first
 * reports itself; a `title` with `whitespace-only` text reports itself.
 * A document with no `head` at all reports nothing. SVG titles never count.
 */
export const check: CheckFn = (doc, ctx) => {
  const titles = doc.querySelectorAll("title").filter((title) => !insideSvg(title));
  if (titles.length === 0) {
    // A fragment's title can live in another file; only a page lacks one.
    if (!doc.isPage()) return [];
    const head = doc.querySelector("head");
    if (head === null) return [];
    return [ctx.report(head, { detail: "head has no title element" })];
  }
  const findings = [];
  for (const extra of titles.slice(1)) {
    findings.push(ctx.report(extra, { detail: "duplicate title element" }));
  }
  for (const title of titles) {
    if (stripAsciiWhitespace(title.text()) === "") {
      findings.push(ctx.report(title, { detail: "empty title element" }));
    }
  }
  return findings;
};
