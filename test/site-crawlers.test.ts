/** Crawler checks run against synthetic output, without building the site. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/site-crawlers.ts", import.meta.url));
const SITE = "https://deadhead.cevdet.ch";
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const page = (path: string, extra = "") => `<!doctype html><html><head><link href="${SITE}${path}" rel="canonical">${extra}</head><body></body></html>`;
const map = (...paths: string[]) => `<urlset ${NS}>${paths.map(path => `<url><loc>${path.startsWith("https:") ? path : SITE + path}</loc><lastmod>2026-10-01</lastmod></url>`).join("")}</urlset>`;
const fixture = (): Record<string, string> => ({
  "robots.txt": `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap-index.xml\n`,
  "sitemap-index.xml": `<?xml version="1.0" encoding="UTF-8"?><sitemapindex ${NS}><sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
  "sitemap-0.xml": map("/", "/rules/example"),
  "index.html": page("/"),
  "rules/example.html": page("/rules/example"),
  "404.html": page("/404", '<meta name="robots" content="noindex">'),
  "500.html": page("/500"),
  "hidden.html": page("/hidden", "<meta content='NOINDEX, follow' name='ROBOTS'>"),
  "old.html": page("/old", '<meta content="0;url=/" http-equiv="refresh">'),
  "alternate.html": page("/"),
  "google123.html": "google-site-verification: google123.html",
});

async function runGate(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), "site-crawlers-"));
  try {
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(dir, path)), { recursive: true });
      await writeFile(join(dir, path), content);
    }
    const result = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    return { status: result.status, out: result.stdout + result.stderr };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("valid output includes every canonical page and excludes ineligible pages", async () => {
  const result = await runGate(fixture());
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /2 canonical pages/);
});

test("follows every child map in the index", async () => {
  const files = fixture();
  files["sitemap-index.xml"] = `<sitemapindex ${NS}><sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap><sitemap><loc>${SITE}/sitemap-1.xml</loc></sitemap></sitemapindex>`;
  files["sitemap-0.xml"] = map("/");
  files["sitemap-1.xml"] = map("/rules/example");
  const result = await runGate(files);
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /2 child sitemap/);
});

test("checks a full HTML document even when the head start tag is omitted", async () => {
  const files = fixture();
  files["rules/example.html"] = '<!doctype html><html><link rel="canonical" href="https://deadhead.cevdet.ch/rules/example"><body>Example</body></html>';
  const result = await runGate(files);
  assert.equal(result.status, 0, result.out);
});

const failures: [string, (files: Record<string, string>) => void, RegExp][] = [
  ["missing robots", f => { delete f["robots.txt"]; }, /robots.txt/],
  ["production crawl block", f => { f["robots.txt"] += "Disallow: /\n"; }, /robots.txt.*crawl/i],
  ["wrong sitemap advertisement", f => { f["robots.txt"] = "User-agent: *\nAllow: /\nSitemap: /sitemap-index.xml"; }, /robots.txt.*sitemap/i],
  ["missing child map", f => { delete f["sitemap-0.xml"]; }, /sitemap-0.xml.*missing/i],
  ["malformed index", f => { f["sitemap-index.xml"] = `<sitemapindex ${NS}><sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemapindex>`; }, /sitemap-index.xml.*structure/i],
  ["malformed child map", f => { f["sitemap-0.xml"] = `<urlset ${NS}><url><loc>${SITE}/</loc></urlset>`; }, /sitemap-0.xml.*structure/i],
  ["wrong child root", f => { f["sitemap-0.xml"] = `<sitemapindex ${NS}></sitemapindex>`; }, /sitemap-0.xml.*structure/i],
  ["missing loc", f => { f["sitemap-0.xml"] = `<urlset ${NS}><url><lastmod>2026-10-01</lastmod></url></urlset>`; }, /sitemap-0.xml.*structure/i],
  ["duplicate XML attributes", f => { f["sitemap-0.xml"] = map("/", "/rules/example").replace(NS, `${NS} ${NS}`); }, /sitemap-0.xml.*structure/i],
  ["unpaired XML quotes", f => { f["sitemap-0.xml"] = map("/", "/rules/example").replace(NS, `${NS} xmlns:bad='urn:bad"`); }, /sitemap-0.xml.*structure/i],
  ["invalid metadata entity", f => { f["sitemap-0.xml"] = map("/", "/rules/example").replace("2026-10-01", "&#0;"); }, /sitemap-0.xml.*structure/i],
  ["invalid XML character", f => { f["sitemap-0.xml"] = map("/", "/rules/example").replace("2026-10-01", "\u0001"); }, /sitemap-0.xml.*structure/i],
  ["invalid XML text", f => { f["sitemap-0.xml"] = map("/", "/rules/example").replace("2026-10-01", "]]>"); }, /sitemap-0.xml.*structure/i],
  ["wrong child host", f => { f["sitemap-index.xml"] = `<sitemapindex ${NS}><sitemap><loc>https://wrong.test/sitemap-0.xml</loc></sitemap></sitemapindex>`; }, /wrong.*origin/i],
  ["duplicate URLs across maps", f => {
    f["sitemap-index.xml"] = `<sitemapindex ${NS}><sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap><sitemap><loc>${SITE}/sitemap-1.xml</loc></sitemap></sitemapindex>`;
    f["sitemap-1.xml"] = map("/");
  }, /duplicate.*URL/i],
  ["duplicate page URL", f => { f["sitemap-0.xml"] = map("/", "/", "/rules/example"); }, /duplicate.*URL/i],
  ["wrong host", f => { f["sitemap-0.xml"] = map("/", "https://wrong.test/rules/example"); }, /wrong.*origin/i],
  ["missing emitted page", f => { f["sitemap-0.xml"] = map("/", "/rules/example", "/missing"); }, /not an indexable canonical page/],
  ["missing canonical page in sitemap", f => { f["sitemap-0.xml"] = map("/"); }, /missing from sitemap.*rules\/example/i],
  ["trailing slash alias", f => { f["sitemap-0.xml"] = map("/", "/rules/example/"); }, /not an indexable canonical page/],
  ["noindex inclusion", f => { f["sitemap-0.xml"] = map("/", "/rules/example", "/hidden"); }, /not an indexable canonical page.*hidden/],
  ["error page inclusion", f => { f["sitemap-0.xml"] = map("/", "/rules/example", "/500"); }, /not an indexable canonical page.*500/],
  ["redirect inclusion", f => { f["sitemap-0.xml"] = map("/", "/rules/example", "/old"); }, /not an indexable canonical page.*old/],
  ["alternate canonical inclusion", f => { f["sitemap-0.xml"] = map("/", "/rules/example", "/alternate"); }, /not an indexable canonical page.*alternate/],
];

for (const [name, change, diagnostic] of failures) {
  test(`rejects ${name}`, async () => {
    const files = fixture();
    change(files);
    const result = await runGate(files);
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, diagnostic);
  });
}
