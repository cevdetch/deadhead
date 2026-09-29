import type { CheckFn } from "../../types.ts";

/**
 * A rule about something missing has no element of its own to point at, so the
 * finding lands on `<head>`. That sets the pattern for every "missing X" rule:
 *
 * - The viewport is looked for across the whole document, not only `<head>`.
 *   Chromium applies a viewport `<meta>` wherever it is inserted, so one in
 *   `<body>` is misplaced but not missing.
 * - Nothing is reported without a `<head>` that has at least one element in it.
 *   Fragments, partials and component templates are not documents, and parse5
 *   gives them an implied, empty head that must not collect findings. It also
 *   keeps the adapters in step: the html-eslint AST and linkedom have no head
 *   at all when the source never wrote one.
 *
 * One gap is accepted rather than papered over: a file with head content but no
 * `<head>` tag (`<!doctype html><title>…`) gets an implied head from parse5
 * only, so the CLI reports it with no line, and the ESLint plugin stays silent.
 * Closing that needs the port to say whether an element was implied.
 */
export const check: CheckFn = (doc, ctx) => {
  // A fragment's viewport lives in the layout around it.
  if (!doc.isPage()) return [];
  if (doc.querySelector('meta[name="viewport" i]') !== null) return [];
  const head = doc.querySelector("head");
  if (head === null || head.children().length === 0) return [];
  return [ctx.report(head)];
};
