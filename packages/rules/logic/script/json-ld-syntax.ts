import type { CheckFn } from "../../types.ts";

/**
 * A document rule only because it has something to say: an element `match`
 * can return true or false, but only `ctx.report` can carry the parser's
 * message, and "Expected ',' or '}' after property value at line 5" is the
 * whole point of the finding.
 *
 * JSON-LD processing aborts on the first syntax error, so there is no partial
 * credit to measure — the block either parses or all of it is lost. An empty
 * or whitespace-only block is a placeholder a script fills, with nothing to
 * lose, and stays quiet. The message
 * wording is the runtime's own, so it differs between engines; the finding
 * does not.
 */
export const check: CheckFn = (doc, ctx) =>
  doc.querySelectorAll('script[type="application/ld+json" i]').flatMap((element) => {
    if (/^[\t\n\f\r ]*$/.test(element.text())) return [];
    try {
      JSON.parse(element.text());
      return [];
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return [ctx.report(element, { detail })];
    }
  });
