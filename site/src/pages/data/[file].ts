import type { APIRoute } from "astro";
import { getPosts } from "../../lib/posts.ts";
import { resultsText } from "../../lib/results.ts";

/**
 * The corpus results a built post cites, served as `/data/<file>` from
 * `corpus/results/`, so a post and its data share one origin. The files hold
 * aggregates only, no domain names (corpus/README.md).
 */
export async function getStaticPaths() {
  const cited = [...new Set((await getPosts()).map((post) => post.data.results))];
  return cited.map((file) => ({ params: { file }, props: { text: resultsText(file) } }));
}

export const GET: APIRoute = ({ props }) => new Response(props["text"] as string, { headers: { "Content-Type": "application/json" } });
