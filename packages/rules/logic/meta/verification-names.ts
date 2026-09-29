import type { FixableFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";

/**
 * `verify-v1` is Google's first site-verification name. Search Console drops
 * a verification once its token disappears, and no statement since 2012 says
 * whether it still reads that name, so removal may revoke one. The other seven
 * names have no reader.
 * https://support.google.com/webmasters/answer/9008080
 */
export const fixable: FixableFn = (element) => asciiLowercase(element.attr("name") ?? "") !== "verify-v1";
