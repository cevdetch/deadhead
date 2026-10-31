import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const rules = "User-agent: *\nAllow: /\n";
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const sitemap = site ? `\nSitemap: ${new URL(`${base}/sitemap-index.xml`, site).href}\n` : "";
  return new Response(rules + sitemap, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
