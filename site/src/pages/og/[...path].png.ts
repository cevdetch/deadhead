import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { generateOG, type OgInput } from "../../lib/og.ts";
import { groupRules } from "../../lib/group.ts";
import { ogSlugForPath } from "../../lib/og-path.ts";
import { impactLabels, severityLabels, tagLabels } from "../../vocabulary.ts";

interface OgPage extends OgInput {
  path: string;
}

export async function getStaticPaths(): Promise<
  { params: { path: string }; props: OgPage }[]
> {
  const rules = await getCollection("rules");
  const byTag = groupRules(rules, (rule) => rule.data.tags);
  const byImpact = groupRules(rules, (rule) => rule.data.impacts);
  // Pages are declared by URL path; the image slug derives from it through
  // the same helper Layout.astro uses, so head tags and route params agree.
  const pages: { urlPath: string; input: OgInput }[] = [
    ...rules.map((rule) => ({
      urlPath: `/rules/${rule.data.ruleId}`,
      input: {
        eyebrow: rule.data.ruleId,
        title: rule.data.title,
        badge: {
          label: severityLabels[rule.data.severity],
          severity: rule.data.severity,
        },
      } as OgInput,
    })),
    {
      urlPath: "/",
      input: {
        eyebrow: "a documentation-driven linter",
        title: "Deadheading is cutting the spent growth off a plant.",
      },
    },
    {
      urlPath: "/install",
      input: { eyebrow: "cli, bookmarklet, eslint", title: "Install" },
    },
    {
      urlPath: "/rules",
      input: {
        eyebrow: "grouped by where it lives",
        title: `All ${rules.length} rules`,
      },
    },
    ...[...byTag].map(([tag, list]) => ({
      urlPath: `/topics/${tag}`,
      input: { eyebrow: "topic", title: `${tagLabels[tag]}: ${list.length} rules` } as OgInput,
    })),
    ...[...byImpact].map(([impact, list]) => ({
      urlPath: `/impacts/${impact}`,
      input: { eyebrow: "impact", title: `${impactLabels[impact]}: ${list.length} rules` } as OgInput,
    })),
    { urlPath: "/topics", input: { eyebrow: "grouped by feature area", title: "Topics" } },
    { urlPath: "/impacts", input: { eyebrow: "grouped by what it costs", title: "Impacts" } },
  ];
  return pages.map(({ urlPath, input }) => {
    const slug = ogSlugForPath(urlPath);
    return { params: { path: slug }, props: { ...input, path: slug } };
  });
}

export const GET: APIRoute = async ({ props }) => {
  const page = props as OgPage;
  const { path: _omit, ...input } = page;
  const png = await generateOG(input);
  // `new Uint8Array(png)` copies into ArrayBuffer-backed storage: plain
  // `Buffer` (typed `Uint8Array<ArrayBufferLike>`) is not assignable to
  // `BodyInit` under the site's strict TS.
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
