import type { CheckFn } from "../../types.ts";
import { eachNode, hasText, hasType, idsWithText, isObject, ldBlocks, schemaTerm, values } from "../../lib/json-ld.ts";

const PROFILE_PAGE = schemaTerm(["ProfilePage"]);
const BREADCRUMB_LIST = schemaTerm(["BreadcrumbList"]);
const MAIN_ENTITY = schemaTerm(["mainEntity"]);
const ITEM_LIST_ELEMENT = schemaTerm(["itemListElement"]);
const ITEM = schemaTerm(["item"]);
const POSITION = schemaTerm(["position"]);
const NAME = schemaTerm(["name"]);
/** Google's profile page takes alternateName when name is absent. */
const PROFILE_NAME = schemaTerm(["name", "alternateName"]);

/** Present at all: a property Google requires counts as given once it holds anything but null or "". */
const present = (list: unknown[]): boolean => list.some((v) => v !== null && v !== "");

/**
 * Google's required properties for two rich results a personal or
 * documentation site emits, as its Search Central pages list them:
 *
 * - ProfilePage: `mainEntity`, and a `name` (or `alternateName`) on it.
 *   https://developers.google.com/search/docs/appearance/structured-data/profile-page
 * - BreadcrumbList: at least two ListItems, each with `position` and `name`,
 *   and `item` on all but the last of the trail. A Thing `item` that carries
 *   a name stands in for the ListItem's.
 *   https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 *
 * Article and its subtypes have no required properties, and the other types
 * Google lists belong to features a site like this does not use, so they stay
 * out until a page of Google's names their requirements as precisely.
 *
 * A name may sit on another node of the page under the same `@id`: every
 * JSON-LD block counts. On a fragment an unresolved `@id` stays quiet, since
 * the layout can define it; everything else reports wherever it is.
 */
export const check: CheckFn = (doc, ctx) => {
  const blocks = ldBlocks(doc);
  const page = doc.isPage();
  const profileNamed = idsWithText(blocks, PROFILE_NAME);
  const named = idsWithText(blocks, NAME);

  /** Has a name inline, or an `@id` that resolves to a named node; `null` when only the layout can say. */
  const nameOf = (value: unknown, term: RegExp, ids: Set<string>): boolean | null => {
    if (!isObject(value)) return false;
    if (values(value, term).some(hasText)) return true;
    if (typeof value["@id"] !== "string") return false;
    if (ids.has(value["@id"])) return true;
    return page ? false : null;
  };

  return blocks.flatMap(({ element, value }) => {
    const problems: string[] = [];
    eachNode(value, (node) => {
      if (hasType(node, PROFILE_PAGE)) {
        const entities = values(node, MAIN_ENTITY);
        if (!present(entities)) problems.push("ProfilePage has no mainEntity");
        else {
          const found = entities.map((entity) => nameOf(entity, PROFILE_NAME, profileNamed));
          if (!found.includes(true) && !found.includes(null)) problems.push("ProfilePage mainEntity has no name");
        }
      }
      if (hasType(node, BREADCRUMB_LIST)) {
        const items = values(node, ITEM_LIST_ELEMENT).filter(isObject);
        if (items.length < 2) problems.push(`BreadcrumbList has ${items.length} ListItem${items.length === 1 ? "" : "s"}, want 2 or more`);
        // The last of the trail is the highest position; array order when positions are not numbers.
        const positions = items.map((item) => Number(values(item, POSITION)[0]));
        const last = positions.every(Number.isFinite) ? positions.indexOf(Math.max(...positions)) : items.length - 1;
        items.forEach((item, index) => {
          const label = `ListItem ${index + 1}`;
          const targets = values(item, ITEM);
          if (!present(values(item, POSITION))) problems.push(`${label} has no position`);
          const own = values(item, NAME).some(hasText);
          if (!own && !targets.some((target) => nameOf(target, NAME, named) !== false)) problems.push(`${label} has no name`);
          if (index !== last && !present(targets)) problems.push(`${label} has no item`);
        });
      }
    });
    return problems.length === 0 ? [] : [ctx.report(element, { detail: problems.join("; ") })];
  });
};
