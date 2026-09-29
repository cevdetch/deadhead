import type { ElementPort, FixableFn } from "../../types.ts";
import { asciiLowercase } from "../../lib/text.ts";

/** The content as keywords: split on ASCII whitespace, ASCII-lowercased, rejoined. */
const keywords = (element: ElementPort): string =>
  asciiLowercase(element.attr("content") ?? "")
    .split(/[\t\n\f\r ]+/)
    .filter((keyword) => keyword !== "")
    .join(" ");

/**
 * WebKit still reads `supported-color-schemes` as an alias of `color-scheme`,
 * so deleting a lone tag changes what Safari renders. A sibling
 * `<meta name="color-scheme">` with the same keywords makes the old tag
 * redundant in every engine; any other finding keeps the element.
 * https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/HTMLMetaElement.cpp
 */
export const fixable: FixableFn = (element) => {
  const own = keywords(element);
  if (own === "") return false;
  return (element.parent()?.children() ?? []).some(
    (sibling) =>
      sibling.tag === "meta" &&
      asciiLowercase(sibling.attr("name") ?? "") === "color-scheme" &&
      keywords(sibling) === own,
  );
};
