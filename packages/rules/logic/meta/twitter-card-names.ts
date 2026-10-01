/**
 * Twitter card tags that change nothing. Some still change a link card, and
 * those are never reported: `twitter:card` picks the layout on X and Discord
 * and is what Apple Messages needs for social-post previews; `twitter:site`
 * and `twitter:creator` bind the card to an X account; `twitter:player*`
 * drives inline players; Slack shows the `label`/`data` pairs.
 *
 * What is reported: a title, description or image that repeats its Open
 * Graph counterpart word for word (X falls back to `og:*`, Discord takes the
 * first non-empty value, so the text on screen does not change), a
 * `twitter:url` next to `og:url`, and `twitter:domain`, which nothing reads.
 * Those carry the autofix. `twitter:app:*` and names outside every list are
 * reported without one: no reader is documented, none is ruled out.
 */

import type { ElementPort, FixableFn, MatchFn } from "../../types.ts";
import { asciiLowercase, stripAsciiWhitespace } from "../../lib/text.ts";

/** Names that still change a card somewhere: never reported. */
const LIVE: ReadonlySet<string> = new Set([
  "twitter:card",
  "twitter:site",
  "twitter:site:id",
  "twitter:creator",
  "twitter:creator:id",
  "twitter:label1",
  "twitter:data1",
  "twitter:label2",
  "twitter:data2",
]);

/** A twitter:* name and the Open Graph property whose identical value makes it a duplicate. */
const COUNTERPART: ReadonlyMap<string, string> = new Map([
  ["twitter:title", "og:title"],
  ["twitter:description", "og:description"],
  ["twitter:image", "og:image"],
  ["twitter:image:src", "og:image"],
  ["twitter:image:width", "og:image:width"],
  ["twitter:image:height", "og:image:height"],
  ["twitter:image:alt", "og:image:alt"],
]);

/** The property a meta element names, from `name` or `property`, lowercased. */
const metaName = (element: ElementPort): string =>
  asciiLowercase(stripAsciiWhitespace(element.attr("name") ?? element.attr("property") ?? ""));

const content = (element: ElementPort): string => stripAsciiWhitespace(element.attr("content") ?? "");

/** The element's `<meta>` siblings, or none for a top-level tag in a fragment. */
const siblings = (element: ElementPort): ElementPort[] =>
  (element.parent()?.children() ?? []).filter((sibling) => sibling !== element && sibling.tag === "meta");

/** A duplicate: an Open Graph counterpart sits beside it with the same trimmed content. */
const repeatsOpenGraph = (element: ElementPort, property: string): boolean =>
  siblings(element).some((sibling) => metaName(sibling) === property && content(sibling) === content(element));

/** A twitter:url beside an og:url: X reads the shared URL either way. */
const besideOgUrl = (element: ElementPort): boolean => siblings(element).some((sibling) => metaName(sibling) === "og:url");

/** True when removing the tag changes no card: the findings that carry the fix. */
const inert = (element: ElementPort, name: string): boolean => {
  if (name === "twitter:domain") return true;
  if (name === "twitter:url") return besideOgUrl(element);
  const property = COUNTERPART.get(name);
  return property !== undefined && repeatsOpenGraph(element, property);
};

export const match: MatchFn = (element) => {
  const name = metaName(element);
  if (LIVE.has(name) || name.startsWith("twitter:player")) return false;
  // A title, description, image or URL is live unless Open Graph repeats it.
  if (COUNTERPART.has(name) || name === "twitter:url") return inert(element, name);
  // twitter:domain, twitter:app:* and any other name: no documented reader.
  return true;
};

export const fixable: FixableFn = (element) => inert(element, metaName(element));
