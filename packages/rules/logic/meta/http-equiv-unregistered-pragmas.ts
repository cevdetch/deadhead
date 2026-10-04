import type { MatchFn } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";
import { OWNED_HTTP_EQUIV } from "../../lib/http-equiv.ts";

/**
 * The WHATWG pragma keywords, and nothing else.
 *
 * `origin-trial` has no spec entry either; `meta/http-equiv-origin-trial`
 * owns it and reports a tag once its tokens expire.
 *
 * Compared ASCII case-insensitively, as an enumerated attribute demands.
 */
const ALLOWED: ReadonlySet<string> = new Set([
  "content-language",
  "content-type",
  "default-style",
  "refresh",
  "set-cookie",
  "x-ua-compatible",
  "content-security-policy",
]);

/**
 * Unregistered, but read: Tor Browser offers the onion address in
 * `onion-location`, and pjax compares `x-pjax-version` to force a full reload.
 * https://community.torproject.org/onion-services/advanced/onion-location/
 * https://github.com/defunkt/jquery-pjax#layout-reloading
 */
const READ_ELSEWHERE: ReadonlySet<string> = new Set(["onion-location", "x-pjax-version"]);

/**
 * The `meta[http-equiv]` selector is only a pre-filter. A tag trips the rule
 * exactly when its value is neither a WHATWG pragma-table keyword nor a
 * value some other rule already owns (`OWNED_HTTP_EQUIV`, `lib/http-equiv.ts`):
 * such a value is no registered pragma, and no other rule reports it. The
 * rule reports without autofixing: MDN notes that some browsers honour
 * extra values, so a tag can still do something in one engine.
 */
export const match: MatchFn = (element) => {
  const value = element.attr("http-equiv");
  if (value === undefined) return false;
  const normalized = stripAsciiWhitespace(value).toLowerCase();
  return !ALLOWED.has(normalized) && !OWNED_HTTP_EQUIV.has(normalized) && !READ_ELSEWHERE.has(normalized);
};
