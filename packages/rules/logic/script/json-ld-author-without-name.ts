import type { CheckFn } from "../../types.ts";
import { eachNode, hasText, idsWithText, isObject, ldBlocks, schemaTerm, values } from "../../lib/json-ld.ts";

const CREDIT = schemaTerm(["author", "creator", "publisher"]);
const NAME = schemaTerm(["name"]);

/**
 * A document rule because the name can sit on another node of the page: a
 * `{"@id": …}` credit resolves against every JSON-LD block the page holds,
 * `@graph` included, and stays quiet when any node with that `@id` carries a
 * name. Google reads one page at a time, so a node on another page, the
 * person's own site included, does not count.
 *
 * `@id`s compare as written, without resolving them against the page URL.
 * Only an object with an `@id` counts as a reference: a credit with no `@id`
 * and no name, or a plain string, is some other problem. A fragment returns
 * nothing: the layout that assembles the page can hold the named node.
 */
export const check: CheckFn = (doc, ctx) => {
  if (!doc.isPage()) return [];
  const blocks = ldBlocks(doc);
  const named = idsWithText(blocks, NAME);
  return blocks.flatMap(({ element, value }) => {
    const unnamed = new Set<string>();
    eachNode(value, (node) => {
      for (const [key, child] of Object.entries(node)) {
        if (!CREDIT.test(key)) continue;
        for (const credit of Array.isArray(child) ? child : [child]) {
          if (!isObject(credit) || typeof credit["@id"] !== "string") continue;
          if (values(credit, NAME).some(hasText) || named.has(credit["@id"])) continue;
          unnamed.add(`${key} ${credit["@id"]} has no name`);
        }
      }
    });
    return unnamed.size === 0 ? [] : [ctx.report(element, { detail: [...unnamed].join("; ") })];
  });
};
