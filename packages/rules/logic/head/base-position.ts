import type { CheckFn, ElementPort } from "../../types.ts";

/**
 * capo.js's top group, "Pragma directives": the head elements that may stand
 * before `<base>`. None of them carries a URL that `<base>` would resolve.
 * https://rviscomi.github.io/capo.js/user/rules/#base
 */
const inTopGroup = (element: ElementPort): boolean => {
  if (element.tag === "base") return true;
  if (element.tag !== "meta") return false;
  if (element.hasAttr("charset") || element.hasAttr("http-equiv")) return true;
  return (element.attr("name") ?? "").toLowerCase() === "viewport";
};

/**
 * A document rule so the finding can name the first element out of order.
 * The HTML Standard requires `<base href>` before every element with a URL
 * attribute; capo.js extends that to the whole head outside its top group.
 * A `<base>` with no parent (a fragment's top level) has no siblings to read
 * and stays quiet, and so does one without `href`: it resolves no URL, and the
 * requirement applies only "if it has an href attribute".
 * https://html.spec.whatwg.org/multipage/semantics.html#the-base-element
 */
export const check: CheckFn = (doc, ctx) =>
  doc.querySelectorAll("base[href]").flatMap((base) => {
    const parent = base.parent();
    if (parent === null || parent.tag !== "head") return [];
    const before = parent.children().slice(0, base.index());
    const offender = before.find((element) => !inTopGroup(element));
    return offender === undefined ? [] : [ctx.report(base, { detail: `after <${offender.tag}>` })];
  });
