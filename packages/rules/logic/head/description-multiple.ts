import type { CheckFn } from "../../types.ts";

/**
 * No selector can count, which is what makes this a document rule.
 *
 * HTML: "There must not be more than one meta element where the name
 * attribute value is an ASCII case-insensitive match for description per
 * document." Google merges the extras into the first, so the first is not at
 * fault: each description past it reports itself, as manifests do.
 * https://html.spec.whatwg.org/multipage/semantics.html#meta-description
 */
export const check: CheckFn = (doc, ctx) => {
  const descriptions = doc.querySelectorAll('meta[name="description" i]');
  return descriptions
    .slice(1)
    .map((extra) => ctx.report(extra, { detail: `${descriptions.length} descriptions on this page` }));
};
