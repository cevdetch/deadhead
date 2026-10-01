import type { CheckFn, ElementPort } from "../../types.ts";

/**
 * The elements the HTML parser keeps in `<head>` ("in head" insertion mode).
 * Any other element pops the head and is reprocessed in the body. Google's
 * own list is stricter (no basefont, bgsound or noframes); following the
 * parser keeps all three adapters on one answer.
 * https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead
 */
const HEAD_CONTENT: ReadonlySet<string> = new Set([
  "base",
  "basefont",
  "bgsound",
  "link",
  "meta",
  "noframes",
  "noscript",
  "script",
  "style",
  "template",
  "title",
]);

const TARGETS = 'link[rel~="canonical" i], link[rel~="alternate" i][hreflang]';

/**
 * Google stops reading the head at the first element that does not belong
 * there, and accepts rel=canonical in the head alone. Adapters build two
 * trees for the same source: parse5 and the DOM move the element and every
 * link after it into `<body>`; `@html-eslint/parser` keeps them in `<head>`
 * as written. Reading both shapes gives one set of findings:
 *
 * - parent is not `<head>`: the moved tree; the element that ended the head
 *   is the body's first child.
 * - parent is `<head>`: the written tree; the element is the first earlier
 *   sibling outside HEAD_CONTENT.
 *
 * Stray text also ends the head, but the port exposes no text, so that case
 * reports in parse5 and the DOM alone.
 * https://developers.google.com/search/docs/crawling-indexing/valid-page-metadata
 */
export const check: CheckFn = (doc, ctx) => {
  if (!doc.isPage()) return [];
  return doc.querySelectorAll(TARGETS).flatMap((link) => {
    const parent = link.parent();
    if (parent === null) return [];
    if (parent.tag === "head") {
      const ender = parent.children().slice(0, link.index()).find((el: ElementPort) => !HEAD_CONTENT.has(el.tag));
      return ender === undefined ? [] : [ctx.report(link, { detail: `after <${ender.tag}>` })];
    }
    // Port objects need not be the same instance twice, so the body's first
    // child is compared with the link by position.
    const first = doc.querySelector("body")?.children()[0];
    const isLink = first === undefined || (parent.tag === "body" && first.index() === link.index());
    return [ctx.report(link, { detail: isLink ? "outside <head>" : `after <${first.tag}>` })];
  });
};
