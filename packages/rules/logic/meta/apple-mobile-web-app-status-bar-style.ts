import type { MatchFn } from "../../types.ts";
import { asciiLowercase, stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * Apple's Safari HTML Reference: the tag takes `default`, `black` or
 * `black-translucent`, and `default` is the status bar a Home Screen app gets
 * with no tag. `black` and `black-translucent` style a surface theme-color
 * does not reach, and since iOS 26 every site added to the Home Screen opens
 * as a web app, so both are live. A missing, `default` or unknown value styles
 * nothing: that is what reports, and what the fix removes.
 * https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html
 */
const LIVE: ReadonlySet<string> = new Set(["black", "black-translucent"]);

export const match: MatchFn = (element) =>
  !LIVE.has(asciiLowercase(stripAsciiWhitespace(element.attr("content") ?? "")));
