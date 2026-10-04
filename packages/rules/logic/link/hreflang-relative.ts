import type { MatchFn } from "../../types.ts";
import { hasScheme } from "../../lib/url.ts";

/**
 * Relative unless it starts with a scheme once trimmed as the URL parser trims
 * it. `android-app://…` is absolute, and so is `href=" https://example.com/en/"`.
 */
export const match: MatchFn = (element) => !hasScheme(element.attr("href") ?? "");
