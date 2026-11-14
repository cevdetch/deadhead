#!/usr/bin/env node
/**
 * Fetches the full git history before a Cloudflare Pages build. Pages clones
 * shallowly, and site/src/lib/lastmod.ts drops git dates on a shallow clone,
 * so every rule page would fall back to its pubDate for sitemap lastmod,
 * article:modified_time and JSON-LD dateModified. Runs only when CF_PAGES is
 * set; a failed fetch leaves the build on that fallback instead of failing it.
 */

import { execFileSync } from "node:child_process";

const git = (args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

if (process.env["CF_PAGES"] === "1") {
  try {
    if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
      git(["fetch", "--unshallow", "--quiet"]);
      console.log("unshallow: fetched the full history for rule modified dates");
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.warn(`unshallow: kept the shallow clone, rule pages use pubDate (${reason})`);
  }
}
