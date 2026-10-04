import type { CheckFn, ElementPort } from "../../types.ts";

/**
 * A main under a `hidden` ancestor or a closed `<dialog>` is out of the
 * accessibility tree, so it is no landmark to jump to. React streaming parks
 * the next view in `<div hidden id="S:1">`; a modal keeps its own `main`.
 */
const outOfTree = (element: ElementPort): boolean => {
  for (let node = element.parent(); node !== null; node = node.parent()) {
    if (node.hasAttr("hidden") || (node.tag === "dialog" && !node.hasAttr("open"))) return true;
  }
  return false;
};

/**
 * The HTML Standard counts `main` elements "that [do] not have the hidden
 * attribute specified", so `:not([hidden])` is the whole test — including
 * `hidden="until-found"`, which has the attribute. A `main` hidden only by CSS
 * still counts: the markup cannot see it, and `hidden` is the sanctioned way
 * to park an inactive view.
 *
 * Every visible `main` is reported once there are two. Which one holds the
 * page's dominant content is the author's call, not the linter's.
 */
export const check: CheckFn = (doc, ctx) => {
  const visible = doc.querySelectorAll("main:not([hidden])").filter((element) => !outOfTree(element));
  if (visible.length < 2) return [];
  return visible.map((element) =>
    ctx.report(element, { detail: `${visible.length} visible main elements in this document` }),
  );
};
