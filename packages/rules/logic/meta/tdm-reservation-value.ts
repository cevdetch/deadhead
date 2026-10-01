import type { MatchFn } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * TDMRep allows `1` (reserved) and `0` (not reserved); "Other values are
 * considered protocol errors" that agents MUST read as unset.
 * https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/
 *
 * The spec says nothing on whitespace, so the value is trimmed first. A tag
 * with no `content` carries no value and trips too.
 */
export const match: MatchFn = (element) => {
  const value = stripAsciiWhitespace(element.attr("content") ?? "");
  return value !== "0" && value !== "1";
};
