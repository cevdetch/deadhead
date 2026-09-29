import type { CheckFn } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * The four properties ogp.me requires on every page.
 * https://ogp.me/#metadata
 */
const REQUIRED: string[] = ["og:title", "og:type", "og:url", "og:image"];

/**
 * No selector can express "some og: tags but not all four", which is what
 * makes this a `kind: "document"` rule rather than an element rule with a
 * logic refinement.
 *
 * Pages with no `og:` property tags stay quiet: no Open Graph strategy means
 * nothing to complete. Only `property`-form tags count toward presence;
 * `name`-form lookalikes belong to `meta/og-name-attribute` and satisfy nothing
 * here. A page with the full set reports nothing.
 */
export const check: CheckFn = (doc, ctx) => {
  // The other required properties can sit in another partial of the page.
  if (!doc.isPage()) return [];
  const present = new Set<string>();
  for (const element of doc.querySelectorAll("meta[property]")) {
    const property = element.attr("property");
    if (property === undefined) continue;
    present.add(stripAsciiWhitespace(property).toLowerCase());
  }
  if (![...present].some((property) => property.startsWith("og:"))) return [];
  const missing = REQUIRED.filter((name) => !present.has(name));
  if (missing.length === 0) return [];
  const head = doc.querySelector("head");
  if (head === null) return [];
  return [ctx.report(head, { detail: `missing ${missing.join(", ")}` })];
};
