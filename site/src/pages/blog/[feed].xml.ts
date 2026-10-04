import type { APIRoute } from "astro";
import { getPosts } from "../../lib/posts.ts";
import { AUTHOR, SITE_NAME } from "../../lib/seo.ts";

// A dynamic route so that, with no post, there is no feed.
export async function getStaticPaths() {
  return (await getPosts()).length === 0 ? [] : [{ params: { feed: "feed" } }];
}

const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Atom 1.0 (RFC 4287): one entry per post, its description as the summary. */
export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const at = (path: string) => new URL(path, site).href;
  const updated = (post: (typeof posts)[number]) => (post.data.updatedDate ?? post.data.pubDate).toISOString();
  const entries = posts.map(
    (post) => `  <entry>
    <id>${at(`/blog/${post.id}`)}</id>
    <title>${escape(post.data.title)}</title>
    <link href="${at(`/blog/${post.id}`)}"/>
    <published>${post.data.pubDate.toISOString()}</published>
    <updated>${updated(post)}</updated>
    <summary>${escape(post.data.description)}</summary>
  </entry>`,
  );
  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${at("/blog")}</id>
  <title>${escape(SITE_NAME)} blog</title>
  <link href="${at("/blog")}"/>
  <link rel="self" href="${at("/blog/feed.xml")}"/>
  <updated>${posts.map(updated).sort().at(-1)}</updated>
  <author><name>${escape(AUTHOR.name)}</name><uri>${AUTHOR.url}</uri></author>
${entries.join("\n")}
</feed>
`;
  return new Response(body, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
};
