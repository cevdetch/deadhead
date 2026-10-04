/**
 * Platforms, told apart by markup they put in every page. A signature matches
 * markup only (a src or href, a generator meta, a framework attribute), never
 * prose. A page can match more than one: a headless CMS behind a framework.
 */
const url = (path: string): RegExp => new RegExp(`(?:src|href)\\s*=\\s*["']?[^"'\\s>]*${path}`, "i");

export const PLATFORMS: readonly { name: string; generator?: RegExp; markup: RegExp[] }[] = [
  { name: "wordpress", generator: /^wordpress/i, markup: [url("/wp-(?:content|includes)/")] },
  { name: "drupal", generator: /^drupal/i, markup: [/data-drupal-|drupalSettings/] },
  { name: "joomla", generator: /^joomla/i, markup: [] },
  { name: "shopify", markup: [url("cdn\\.shopify\\.com/"), /Shopify\.shop\s*=/] },
  { name: "wix", generator: /^wix\.com/i, markup: [url("static\\.parastorage\\.com/")] },
  { name: "squarespace", markup: [url("static1\\.squarespace\\.com/"), /<!-- This is Squarespace\. -->/] },
  { name: "webflow", generator: /^webflow/i, markup: [/<html[^>]+data-wf-(?:page|site)=/i] },
  { name: "tilda", markup: [url("tildacdn\\.")] },
  { name: "bitrix", markup: [url("/bitrix/(?:js|cache|templates)/")] },
  { name: "hubspot", generator: /^hubspot/i, markup: [] },
  { name: "ghost", generator: /^ghost/i, markup: [] },
  { name: "aem", markup: [url("/etc\\.clientlibs/")] },
  { name: "next.js", markup: [/<script[^>]+id=["']?__NEXT_DATA__/i, url("/_next/static/")] },
  { name: "nuxt", markup: [/window\.__NUXT__|<div[^>]+id=["']?__nuxt/i, url("/_nuxt/")] },
  { name: "gatsby", generator: /^gatsby/i, markup: [/<div[^>]+id=["']?___gatsby/i] },
  { name: "astro", generator: /^astro/i, markup: [/<astro-island[\s>]/i] },
  { name: "sveltekit", markup: [/data-sveltekit-|__sveltekit_/] },
  { name: "angular", markup: [/\sng-version=["']?\d/i] },
];

/** The content of every `<meta name="generator">`, in either attribute order. */
function generators(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\bname\s*=\s*["']?generator\b/i.test(tag)) continue;
    const content = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    if (content !== null) found.push((content[1] ?? content[2] ?? content[3] ?? "").trim());
  }
  return found;
}

/** Platform names whose signature the page carries, in PLATFORMS order. */
export function detectPlatforms(html: string): string[] {
  const generator = generators(html);
  return PLATFORMS.filter(
    (p) => (p.generator !== undefined && generator.some((g) => p.generator?.test(g))) || p.markup.some((re) => re.test(html)),
  ).map((p) => p.name);
}
