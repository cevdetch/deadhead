// Page path → OG image slug. Single source of truth, shared by
// `layouts/Layout.astro` (the `og:image` head tag) and
// `pages/og/[...path].png.ts` (the prerendered route params) so the two
// can never drift into a page pointing at an image that doesn't exist.
//
// Depends on nothing: importing this from Layout must never drag satori
// or sharp into every page render.
export function ogSlugForPath(path: string): string {
  if (path === "/") return "index";
  return path.replace(/^\/rules\//, "").replace(/^\//, "");
}

/** The site-relative URL of a page's OG image, for `og:image` and JSON-LD `image`. */
export const ogImagePath = (path: string): string => `/og/${ogSlugForPath(path)}.png`;
