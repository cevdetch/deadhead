import type { MatchFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";
import { trimUrl } from "../../lib/url.ts";

/**
 * Relative unless it starts with `http://` or `https://` once trimmed as the
 * URL parser trims it: `href=" https://example.com/"` is absolute. A
 * protocol-relative `//host/` still reports. A canonical with no `href` is
 * `link/href-missing`'s.
 */
export const match: MatchFn = (element) => {
  const href = asciiLowercase(trimUrl(element.attr("href") ?? ""));
  return !href.startsWith("http://") && !href.startsWith("https://");
};
