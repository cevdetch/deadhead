// @ts-check
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Rule `pubDate` frontmatter mapped to sitemap `lastmod`, so crawlers
// prioritize updates. Read here rather than in a content loader: the
// sitemap integration only sees final URLs, so the config joins them.
const contentRulesDir = fileURLToPath(new URL("../content/rules/", import.meta.url));

/** @returns {Map<string, string>} URL path (`/rules/<ruleId>`) to `YYYY-MM-DD`. */
function loadLastmod() {
  const out = new Map();
  let files = [];
  try {
    files = readdirSync(contentRulesDir, { recursive: true });
  } catch {
    return out;
  }
  for (const file of files) {
    if (typeof file !== "string" || !file.endsWith(".md")) continue;
    const ruleId = file.replace(/\.md$/, "").split("\\").join("/");
    const body = readFileSync(join(contentRulesDir, file), "utf8");
    const match = /^pubDate:\s*"(\d{4}-\d{2}-\d{2})"/m.exec(body);
    if (match?.[1]) out.set(`/rules/${ruleId}`, match[1]);
  }
  return out;
}

const lastmodByPath = loadLastmod();

export default defineConfig({
  site: "https://deadhead.cevdet.ch",

  // `ruleUrl()` in packages/core/vocabulary.ts prints
  // https://deadhead.cevdet.ch/rules/<ruleId> — no trailing slash — into every
  // finding, every SARIF upload and every ESLint rule's metadata, all of which
  // outlive the run that emitted them. So "never" is a contract, not taste.
  //
  // `format: "file"` is what makes it true on the host. Cloudflare Pages
  // canonicalises a directory index the other way: given /foo/index.html it
  // serves /foo/ and 308s /foo to it. Emitting /foo.html instead gets the
  // extensionless, slash-free URL with no redirect, which is Cloudflare's own
  // documented advice for this case.
  trailingSlash: "never",
  build: { format: "file" },

  integrations: [
    {
      name: "deadhead-artifacts",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          const { copyFile } = await import("node:fs/promises");
          for (const name of ["bookmarklet.js", "deadhead.css"]) {
            await copyFile(new URL(`../packages/browser/${name}`, import.meta.url), new URL(name, dir));
          }
        },
      },
    },
    {
      name: "deadhead-host",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          const { writeFile } = await import("node:fs/promises");
          // Hashed build assets never change under the same name.
          await writeFile(new URL("_headers", dir), "/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n");
        },
      },
    },
    sitemap({
      serialize(item) {
        const path =
          new URL(item.url).pathname.replace(/\/$/, "") || "/";
        const lastmod = lastmodByPath.get(path);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  markdown: { syntaxHighlight: false },
});
