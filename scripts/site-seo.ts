#!/usr/bin/env node
/**
 * SEO gate over the built site, run by `pnpm check:site` after the byte
 * budget. Reads site/dist as files; builds nothing. Each check guards a
 * decision in .claude/plans/2026-09-29-seo.md.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dist = process.argv[2] ?? "site/dist";
const problems: string[] = [];

/** Astro escapes <, > and " in text and " in attributes; checks read the decoded value. */
const decode = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** The decoded `content` of `<meta name|property="key">`, or null. */
const metaContent = (html: string, attr: "name" | "property", key: string): string | null => {
  const match = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html);
  return match?.[1] === undefined ? null : decode(match[1]);
};

// Every page with a <head>. A file without one, like a search-console
// verification page, carries nothing to check.
const pages: { path: string; html: string }[] = [];
for (const file of (await readdir(dist, { recursive: true })).filter((f) => f.endsWith(".html")).sort()) {
  const html = await readFile(join(dist, file), "utf8");
  if (/<head[\s>]/i.test(html)) pages.push({ path: file.split("\\").join("/"), html });
}

// One <h1> per page: the page's subject, stated once (decision S3).
for (const { path, html } of pages) {
  const count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (count !== 1) problems.push(`${path}: ${count} <h1> elements, want 1`);
}

// The home page names the project the same way everywhere: no markup
// characters that previews and SEO tools strip, and a description long
// enough to say what it does (decisions S1, S2).
const home = pages.find((p) => p.path === "index.html");
if (home === undefined) {
  problems.push("index.html: missing");
} else {
  const title = decode(/<title>([^<]*)<\/title>/.exec(home.html)?.[1] ?? "");
  const description = metaContent(home.html, "name", "description") ?? "";
  if (/[<>]/.test(title)) problems.push(`index.html: title holds < or >: ${title}`);
  if (/[<>]/.test(description)) problems.push(`index.html: description holds < or >: ${description}`);
  if (description.length < 120 || description.length > 160) {
    problems.push(`index.html: description is ${description.length} characters, want 120-160`);
  }
}

/** Every node of every JSON-LD block on the page, `@graph` flattened. A block that fails to parse adds a problem. */
const jsonLdNodes = (path: string, html: string): Record<string, unknown>[] => {
  const nodes: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)) {
    let value: unknown;
    try {
      value = JSON.parse(match[1] ?? "");
    } catch {
      problems.push(`${path}: JSON-LD does not parse`);
      continue;
    }
    const top = Array.isArray(value) ? value : [value];
    for (const node of top) {
      if (node === null || typeof node !== "object") continue;
      const graph = (node as { "@graph"?: unknown })["@graph"];
      if (Array.isArray(graph)) nodes.push(...(graph as Record<string, unknown>[]));
      else nodes.push(node as Record<string, unknown>);
    }
  }
  return nodes;
};

const nodesByPage = new Map(pages.map(({ path, html }) => [path, jsonLdNodes(path, html)]));

// The home page names the site for search results (decision S4).
if (home !== undefined) {
  const website = nodesByPage.get("index.html")?.find((n) => n["@type"] === "WebSite");
  if (website === undefined || typeof website["name"] !== "string" || typeof website["url"] !== "string") {
    problems.push("index.html: no JSON-LD WebSite node with name and url");
  }
}

// Rule pages are articles: headline, dates, author and the sources the rule
// cites (decisions S4, S5). validate:rules guarantees two or more sources.
const ARTICLE_FIELDS = ["headline", "description", "url", "datePublished", "dateModified", "author"] as const;
for (const { path } of pages.filter((p) => p.path.startsWith("rules/"))) {
  const article = nodesByPage.get(path)?.find((n) => n["@type"] === "TechArticle");
  if (article === undefined) {
    problems.push(`${path}: no JSON-LD TechArticle node`);
    continue;
  }
  for (const field of ARTICLE_FIELDS) {
    if (article[field] === undefined) problems.push(`${path}: TechArticle lacks ${field}`);
  }
  // Google's Rich Results Test flags a bare date as invalid and zoneless.
  for (const field of ["datePublished", "dateModified"] as const) {
    const value = article[field];
    if (value !== undefined && !(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/.test(value))) {
      problems.push(`${path}: TechArticle ${field} is not a datetime with a time zone: ${String(value)}`);
    }
  }
  const cited = Array.isArray(article["citation"]) ? article["citation"].length : 0;
  if (cited < 2) problems.push(`${path}: TechArticle cites ${cited} sources, want 2 or more`);
}

// Blog posts are BlogPostings with the same article fields and an author.
for (const { path } of pages.filter((p) => /^blog\/[^/]+\.html$/.test(p.path))) {
  const post = nodesByPage.get(path)?.find((n) => n["@type"] === "BlogPosting");
  if (post === undefined) {
    problems.push(`${path}: no JSON-LD BlogPosting node`);
    continue;
  }
  for (const field of ARTICLE_FIELDS) {
    if (post[field] === undefined) problems.push(`${path}: BlogPosting lacks ${field}`);
  }
  for (const field of ["datePublished", "dateModified"] as const) {
    const value = post[field];
    if (value !== undefined && !(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/.test(value))) {
      problems.push(`${path}: BlogPosting ${field} is not a datetime with a time zone: ${String(value)}`);
    }
  }
}

// llms.txt per https://llmstxt.org: an H1, a blockquote summary, and a link
// to the markdown copy of every rule page; each copy exists; llms-full.txt
// exists (decision S8).
const readText = (rel: string) => readFile(join(dist, rel), "utf8").catch(() => null);
const rulePages = pages.filter((p) => p.path.startsWith("rules/"));
const llms = await readText("llms.txt");
if (llms === null) {
  problems.push("llms.txt: missing");
} else {
  if (!/^# .+\n\n> .+/.test(llms)) problems.push('llms.txt: must open with "# " and a "> " summary');
  for (const { path } of rulePages) {
    const md = `/${path.replace(/\.html$/, ".md")}`;
    if (!llms.includes(`${md})`)) problems.push(`llms.txt: no link to ${md}`);
  }
}
for (const { path } of rulePages) {
  const md = path.replace(/\.html$/, ".md");
  const text = await readText(md);
  if (text === null) problems.push(`${md}: missing`);
  else if (!text.startsWith("# ")) problems.push(`${md}: must open with "# "`);
}
if ((await readText("llms-full.txt")) === null) problems.push("llms-full.txt: missing");

for (const problem of problems) process.stdout.write(`✗ ${problem}\n`);
if (problems.length === 0) process.stdout.write(`✓ SEO checks passed on ${pages.length} pages\n`);
process.exit(problems.length > 0 ? 1 : 0);
