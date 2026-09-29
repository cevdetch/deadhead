import type { CheckFn, ElementPort } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";

const MANIFEST = 'link[rel~="manifest" i]';

/**
 * A later manifest link never loads, so removing it changes nothing unless its
 * `rel` carries another keyword that still works: `rel="manifest icon"` would
 * take an icon with it.
 */
const manifestOnly = (element: ElementPort): boolean =>
  asciiLowercase(element.attr("rel") ?? "")
    .split(/[\t\n\f\r ]+/)
    .filter((token) => token !== "")
    .every((token) => token === "manifest");

/**
 * HTML: "only the first link element in tree order whose rel attribute
 * contains the token manifest may be used". Each manifest link past the first
 * reports itself; the first stays quiet. A document rule settles its fixes
 * here: a link whose `rel` holds another keyword keeps its element.
 * https://html.spec.whatwg.org/multipage/links.html#link-type-manifest
 */
export const check: CheckFn = (doc, ctx) =>
  doc
    .querySelectorAll(MANIFEST)
    .slice(1)
    .map((extra) => {
      const finding = ctx.report(extra, { detail: "manifest link past the first" });
      if (!manifestOnly(extra)) finding.fix = null;
      return finding;
    });
