import type { MatchFn } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * The directive names Google documents, lowercased: its valid-rules table
 * plus `index` and `follow`, which Google names as the defaults. Google
 * ignores everything else, including its own historical `noarchive`,
 * `nocache` and `nositelinkssearchbox`, so on a tag addressed to Google's
 * crawlers those trip like any other unknown token.
 */
const GOOGLE_NAMES: ReadonlySet<string> = new Set([
  "all",
  "index",
  "follow",
  "noindex",
  "nofollow",
  "none",
  "nosnippet",
  "indexifembedded",
  "noimageindex",
  "notranslate",
  "max-snippet",
  "max-image-preview",
  "max-video-preview",
  "unavailable_after",
]);

/**
 * `name="robots"` addresses every crawler, so a token is live when any crawler
 * documents it: Google's names, plus `noarchive` (Bing, Yandex), `nocache`
 * (Bing) and `archive` (Yandex). `noodp`, `noydir` and `nositelinkssearchbox`
 * stay out: no crawler documents them today.
 */
const ANY_CRAWLER_NAMES: ReadonlySet<string> = new Set([...GOOGLE_NAMES, "noarchive", "nocache", "archive"]);

/**
 * Google documents two crawler names and ignores other values, so those tags
 * are held to Google's table. `robots` addresses every crawler, and `bingbot`,
 * `yandex` and `applebot` publish lists without saying what happens to other
 * tokens, so those tags are held to the wider table: a token no crawler
 * documents trips there, and a token another engine documents does not.
 */
const GOOGLE_AGENTS: ReadonlySet<string> = new Set(["googlebot", "googlebot-news"]);

/** Names that need a value; a bare one sets no limit, so it trips. */
const PARAMETRIZED: ReadonlySet<string> = new Set([
  "max-snippet",
  "max-image-preview",
  "max-video-preview",
  "unavailable_after",
]);

/** Integers, with the -1 Google and Bing document for unlimited. */
const INTEGER = /^-?\d+$/;

const paramOk = (name: string, value: string): boolean => {
  switch (name) {
    case "max-snippet":
    case "max-video-preview":
      return INTEGER.test(value);
    case "max-image-preview":
      return value === "none" || value === "standard" || value === "large";
    case "unavailable_after":
      return value !== "";
    default:
      return false;
  }
};

/**
 * Google's list form is comma-separated, and a parameter reads `name: value`
 * with optional spaces around the colon. A value can hold spaces itself
 * (`unavailable_after: 25 Jun 2010 15:00:00 PST`), so an item is split on its
 * first colon and never on whitespace. An item without a colon may still hold
 * several bare names separated by spaces (`noindex nofollow`).
 */
const WHITESPACE = /[\t\n\f\r ]+/;

/** The name an item opens with: everything before its first colon or space. */
const leadingName = (item: string): string =>
  stripAsciiWhitespace(item).split(/[:\t\n\f\r ]/, 1)[0] ?? "";

/**
 * Split `content` into items. Google accepts RFC 822 and RFC 850 dates for
 * `unavailable_after` (`Sat, 25 Jun 2010 15:00:00 GMT`), whose own comma
 * would otherwise cut the date in two. Every comma inside such a date is
 * followed by a digit, and no robots token opens with one, so an item that
 * opens with a digit folds back into the `unavailable_after` item before it.
 */
const DATE_TAIL = /^[\t\n\f\r ]*\d/;
const items = (content: string): string[] => {
  const out: string[] = [];
  for (const item of content.split(",")) {
    const last = out.at(-1);
    if (last !== undefined && leadingName(last) === "unavailable_after" && DATE_TAIL.test(item)) {
      out[out.length - 1] = `${last},${item}`;
    } else {
      out.push(item);
    }
  }
  return out;
};

/**
 * The selector (`robots`, `googlebot`, `googlebot-news`, `bingbot`, `yandex`,
 * `applebot`) is only a pre-filter. A tag trips the rule when one of its
 * content tokens is outside the table for the crawlers it addresses, or a
 * parameter carries no well-formed value: no crawler the tag addresses
 * documents such a token, so a typo voids indexing intent without warning.
 *
 * Tags with no `content` attribute, or with no parseable tokens, stay quiet:
 * there is nothing to judge.
 */
export const match: MatchFn = (element) => {
  const content = element.attr("content");
  if (content === undefined) return false;
  const name = (element.attr("name") ?? "").toLowerCase();
  const known = GOOGLE_AGENTS.has(name) ? GOOGLE_NAMES : ANY_CRAWLER_NAMES;
  for (const item of items(content.toLowerCase())) {
    const colon = item.indexOf(":");
    if (colon >= 0) {
      const directive = stripAsciiWhitespace(item.slice(0, colon));
      const value = stripAsciiWhitespace(item.slice(colon + 1));
      if (!known.has(directive) || !paramOk(directive, value)) return true;
      continue;
    }
    for (const token of item.split(WHITESPACE)) {
      if (token === "") continue;
      if (!known.has(token) || PARAMETRIZED.has(token)) return true;
    }
  }
  return false;
};
