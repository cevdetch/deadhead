import { getCollection, type CollectionEntry } from "astro:content";

/**
 * Drafts render in `astro dev`, and in a build run with `DEADHEAD_DRAFTS=1`
 * so `check:site` can test a draft's pages before it ships. A normal build
 * leaves them out, and with no published post there is no /blog at all.
 */
const showDrafts = import.meta.env.DEV || process.env["DEADHEAD_DRAFTS"] === "1";

/** Posts to build, newest first. */
export async function getPosts(): Promise<CollectionEntry<"posts">[]> {
  const posts = await getCollection("posts", (post) => showDrafts || !post.data.draft);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id));
}
