import type { ElementPort, FixableFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";

/** Whether a link's `rel` holds the token. */
const hasRel = (element: ElementPort, token: string): boolean =>
  element.tag === "link" &&
  asciiLowercase(element.attr("rel") ?? "")
    .split(/[\t\n\f\r ]+/)
    .includes(token);

/**
 * Removing the tag is inert only where iOS has another source for the launch
 * mode and nothing else hangs off the tag. Without a manifest, iOS 16.4 to 18
 * save the site as a browser bookmark; with `apple-touch-startup-image` links,
 * the splash screens stop appearing. So the fix runs when a sibling links a
 * manifest and none links a startup image. A tag at a fragment's top level
 * has no siblings to read and keeps its finding without a fix.
 * https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
 */
export const fixable: FixableFn = (element) => {
  const siblings = element.parent()?.children() ?? [];
  return siblings.some((el) => hasRel(el, "manifest")) && !siblings.some((el) => hasRel(el, "apple-touch-startup-image"));
};
