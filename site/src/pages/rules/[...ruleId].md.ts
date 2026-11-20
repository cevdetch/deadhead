// `/rules/<ruleId>.md`: the page's clean markdown copy, per llmstxt.org.
import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { toRuleDoc } from "../../lib/rule-doc.ts";
import { ruleMarkdown } from "../../lib/rule-markdown.ts";

export const getStaticPaths = (async () =>
  (await getCollection("rules")).map((rule) => ({
    params: { ruleId: rule.data.ruleId },
    props: { doc: toRuleDoc(rule) },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) =>
  new Response(ruleMarkdown(props.doc, new URL(`/rules/${props.doc.ruleId}`, site).href), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
