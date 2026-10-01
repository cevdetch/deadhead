import type { CheckFn } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * No selector can express "some og: tag but not og:image", which is what
 * makes this a `kind: "document"` rule rather than an element rule with a
 * logic refinement.
 *
 * Of ogp.me's four required properties, og:image is the one link previews
 * cannot fill from other markup: Mastodon reads the title from <title>, the
 * description from the meta description and the URL from rel=canonical, and
 * Meta and ogp.me default og:type to website. og:image:url and
 * og:image:secure_url satisfy nothing: Mastodon reads og:image alone.
 * https://ogp.me/#metadata
 *
 * Pages with no `og:` property tags stay quiet: no Open Graph strategy means
 * nothing to complete. Only `property`-form tags count; `name`-form lookalikes
 * belong to `meta/og-name-attribute`.
 */
export const check: CheckFn = (doc, ctx) => {
  // The image can sit in another partial of the page.
  if (!doc.isPage()) return [];
  const present = new Set<string>();
  for (const element of doc.querySelectorAll("meta[property]")) {
    const property = element.attr("property");
    if (property === undefined) continue;
    present.add(stripAsciiWhitespace(property).toLowerCase());
  }
  if (present.has("og:image")) return [];
  if (![...present].some((property) => property.startsWith("og:"))) return [];
  const head = doc.querySelector("head");
  if (head === null) return [];
  return [ctx.report(head, { detail: "missing og:image" })];
};
