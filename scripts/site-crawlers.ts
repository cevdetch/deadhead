#!/usr/bin/env node
/** Read-only gate for the production crawler files in a built site. */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHtml } from "../packages/cli/adapter.ts";
import { SITE_URL } from "../packages/core/vocabulary.ts";

const dist = process.argv[2] ?? "site/dist";
const entry = `${SITE_URL}/sitemap-index.xml`;
const problems: string[] = [];

async function read(path: string): Promise<string> {
  try {
    return await readFile(join(dist, path), "utf8");
  } catch {
    throw new Error(`${path}: missing or unreadable`);
  }
}

/** Validate the XML subset emitted by @astrojs/sitemap, not forgiving HTML.
 * Require balanced containers, one loc per entry and scalar metadata. Fail
 * closed if the generator starts emitting a different structure.
 */
function locations(xml: string, root: "sitemapindex" | "urlset", file: string): string[] {
  const invalid = () => new Error(`${file}: invalid sitemap structure`);
  const text = String.raw`(?:[^<&]|&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)*`;
  const decode = (value: string): string => {
    if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/.test(value)) throw invalid();
    const decoded = value.replace(/&([^;]+);/g, (_, entity: string) => {
      const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
      if (named[entity] !== undefined) return named[entity];
      const code = entity.startsWith("#x") ? Number.parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) throw invalid();
      return String.fromCodePoint(code);
    });
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u{d800}-\u{dfff}\ufffe\uffff]/u.test(decoded)) throw invalid();
    return decoded;
  };
  decode(xml); // Check characters and entities in metadata and attributes too.
  if (xml.includes("]]>")) throw invalid();
  const body = xml.trim().replace(/^<\?xml\s+version=(["'])1\.0\1(?:\s+encoding=(["'])UTF-8\2)?\s*\?>\s*/i, "");
  const document = new RegExp(`^<${root}([^<>]*)>([\\s\\S]*)</${root}>$`).exec(body);
  if (!document) throw invalid();
  const attributes = document[1] ?? "";
  const namespaces = new Map<string, string>();
  const attribute = /\s+(xmlns(?::[A-Za-z_][\w.-]*)?)\s*=\s*(["'])([^<>]*?)\2/y;
  let at = 0;
  while (attributes.slice(at).trim()) {
    attribute.lastIndex = at;
    const match = attribute.exec(attributes);
    if (!match || namespaces.has(match[1]!)) throw invalid();
    namespaces.set(match[1]!, decode(match[3] ?? ""));
    at = attribute.lastIndex;
  }
  if (namespaces.get("xmlns") !== "http://www.sitemaps.org/schemas/sitemap/0.9") throw invalid();
  const tag = root === "sitemapindex" ? "sitemap" : "url";
  const metadata = root === "sitemapindex" ? "lastmod" : "lastmod|changefreq|priority";
  const record = new RegExp(`\\s*<${tag}>\\s*<loc>(${text})</loc>((?:\\s*<(${metadata})>${text}</\\3>)*)\\s*</${tag}>`, "y");
  const contents = document[2] ?? "";
  const urls: string[] = [];
  let offset = 0;
  while (contents.slice(offset).trim()) {
    record.lastIndex = offset;
    const match = record.exec(contents);
    if (!match) throw invalid();
    const value = decode(match[1] ?? "").trim();
    if (!value) throw invalid();
    urls.push(value);
    offset = record.lastIndex;
  }
  if (!urls.length) throw invalid();
  return urls;
}

function productionUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`Invalid absolute URL: ${value}`); }
  if (url.origin !== SITE_URL || url.username || url.password) throw new Error(`Wrong production origin: ${value}`);
  if (url.search || url.hash || url.href !== value) throw new Error(`Noncanonical URL: ${value}`);
  return url;
}

try {
  const robots = (await read("robots.txt")).split(/\r?\n/).map(line => line.replace(/#.*$/, "").trim());
  if (!robots.some(line => /^user-agent:\s*\*$/i.test(line)) || robots.some(line => /^disallow:\s*\S/i.test(line))) {
    problems.push("robots.txt: production crawling must be allowed");
  }
  const advertised = robots.filter(line => /^sitemap:/i.test(line)).map(line => line.replace(/^sitemap:\s*/i, ""));
  if (advertised.length !== 1 || advertised[0] !== entry) problems.push(`robots.txt: expected Sitemap: ${entry}`);

  const children = locations(await read("sitemap-index.xml"), "sitemapindex", "sitemap-index.xml");
  const seenMaps = new Set<string>();
  const urls = new Set<string>();
  for (const child of children) {
    const url = productionUrl(child);
    // Only local numbered child maps; never fetch URLs or traverse disk paths.
    if (!/^\/sitemap-\d+\.xml$/.test(url.pathname)) throw new Error(`Invalid child sitemap URL: ${child}`);
    if (seenMaps.has(child)) throw new Error(`Duplicate child sitemap URL: ${child}`);
    seenMaps.add(child);
    const file = url.pathname.slice(1);
    for (const value of locations(await read(file), "urlset", file)) {
      productionUrl(value);
      if (urls.has(value)) problems.push(`Duplicate sitemap page URL: ${value}`);
      urls.add(value);
    }
  }

  const expected = new Set<string>();
  for (const file of (await readdir(dist, { recursive: true })).filter(file => file.endsWith(".html"))) {
    const html = await read(file);
    // Public verification files are not pages. The CLI adapter supplies robust
    // attribute/entity parsing without leaking parse5 into another module.
    const { doc } = parseHtml(html);
    if (!doc.isPage() && !/<head[\s>]/i.test(html)) continue;
    const head = doc.querySelector("head");
    const metas = head?.children().filter(node => node.tag === "meta") ?? [];
    const noindex = metas.some(node => ["robots", "googlebot"].includes(node.attr("name")?.toLowerCase() ?? "")
      && /(?:^|[\s,])(noindex|none)(?:$|[\s,])/i.test(node.attr("content") ?? ""));
    const redirect = metas.some(node => node.attr("http-equiv")?.toLowerCase() === "refresh");
    const path = file.split("\\").join("/");
    if (/^(404|500)\.html$/.test(path) || noindex || redirect) continue;
    const identity = new URL(path === "index.html" ? "/" : `/${path.replace(/\.html$/, "")}`, SITE_URL).href;
    const canonicals = head?.children().filter(node => node.tag === "link"
      && node.attr("rel")?.toLowerCase().split(/\s+/).includes("canonical")) ?? [];
    if (canonicals.length !== 1 || !canonicals[0]?.attr("href")) {
      problems.push(`${path}: expected one canonical URL`);
      continue;
    }
    const canonical = new URL(canonicals[0].attr("href")!, identity).href;
    if (canonical === identity) expected.add(identity);
  }
  for (const url of urls) if (!expected.has(url)) problems.push(`Sitemap URL is not an indexable canonical page: ${url}`);
  for (const url of expected) if (!urls.has(url)) problems.push(`Canonical page missing from sitemap: ${url}`);
  if (!problems.length) process.stdout.write(`✓ Crawler checks passed: ${urls.size} canonical pages in ${seenMaps.size} child sitemap(s)\n`);
} catch (error) {
  problems.push(error instanceof Error ? error.message : String(error));
}
for (const problem of problems) process.stderr.write(`✗ ${problem}\n`);
process.exitCode = problems.length ? 1 : 0;
