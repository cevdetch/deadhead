import type { CheckFn } from "../../types.ts";

/**
 * The HTML Standard caps the encoding prescan at 1024 bytes.
 * https://html.spec.whatwg.org/multipage/parsing.html#prescan-a-byte-stream-to-determine-its-encoding
 */
const PRESCAN_LIMIT = 1024;

/**
 * No selector can express "ends after byte 1024", which is what makes this a
 * `kind: "document"` rule rather than an element rule with a logic refinement.
 *
 * Two deliberate choices:
 *
 * - The *end* offset is compared, not the start. The spec requires the element
 *   to be "serialized completely within the first 1024 bytes", so a declaration
 *   straddling the boundary is already lost.
 * - Offsets are in characters, not bytes. The port has no access to the source
 *   text, so the true byte count cannot be computed here — but every non-ASCII
 *   character before the declaration only makes that count larger, so this
 *   under-reports and never fabricates a finding.
 */
export const check: CheckFn = (doc, ctx) => {
  const element = doc.querySelector("meta[charset]");
  if (element === null) return [];

  // Null in the DOM adapter: a live element has no source offsets, and there is
  // nothing to salvage — the bytes this rule is about are already gone.
  const range = element.range();
  if (range === null) return [];

  const end = range[1];
  if (end <= PRESCAN_LIMIT) return [];

  return [
    ctx.report(element, {
      detail: `ends at offset ${end}, past the ${PRESCAN_LIMIT}-byte prescan window`,
    }),
  ];
};
