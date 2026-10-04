import type { MatchFn } from "../../types.ts";

/**
 * A literal `</` counts. A serializer that passes `</` through would pass
 * `</script` too, and that ends the element mid-value. One that escapes the
 * slash (`<\/p>`) or the `<` (`\u003c`) emits `</script` safely, and a bare
 * `<` ("5 < 6") cannot end the block, so neither reports.
 *
 * A `</script>` already in a value ends the element at parse time, so it never
 * reaches this text: the truncated block is `script/json-ld-syntax`'s finding.
 * The rule sees the serializer's output, not the serializer, which is why its
 * findings are "possible".
 */
export const match: MatchFn = (element) => element.text().includes("</");
