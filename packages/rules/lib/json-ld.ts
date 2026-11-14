import type { DocumentPort, ElementPort } from "../types.ts";

export const isLdJson = (element: ElementPort): boolean =>
  element.tag === "script" && element.attr("type")?.toLowerCase() === "application/ld+json";

/** A JSON-LD block's parsed value. `{ ok: false }` when it is not valid JSON: script/json-ld-syntax reports that. */
export const parseLdJson = (element: ElementPort): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(element.text()) };
  } catch {
    return { ok: false };
  }
};

/** schema.org terms as JSON-LD spells them: bare, `schema:`-prefixed or a full IRI. Whole names only. */
export const schemaTerm = (names: readonly string[]): RegExp =>
  new RegExp(`^(?:schema:|https?://schema\\.org/)?(?:${names.join("|")})$`);

/** Does this node's `@type` (a string or a list) name one of the terms? */
export const hasType = (node: unknown, term: RegExp): boolean => {
  if (node === null || typeof node !== "object" || Array.isArray(node)) return false;
  const type = (node as Record<string, unknown>)["@type"];
  return (Array.isArray(type) ? type : [type]).some((t) => typeof t === "string" && term.test(t));
};

/** Depth-first over every object and array, `@graph` included. Iterative: no stack overflow on deep input. */
export const someNode = (value: unknown, test: (node: Record<string, unknown>) => boolean): boolean => {
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    // A loop, not `push(...items)`: spreading a huge array into arguments
    // overflows the call stack with a RangeError.
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
    } else if (current !== null && typeof current === "object") {
      const node = current as Record<string, unknown>;
      if (test(node)) return true;
      for (const item of Object.values(node)) stack.push(item);
    }
  }
  return false;
};

/** Calls `visit` on every object `someNode` would test, `@graph` included. */
export const eachNode = (value: unknown, visit: (node: Record<string, unknown>) => void): void => {
  someNode(value, (node) => {
    visit(node);
    return false;
  });
};

/** Every parsed JSON-LD block of the document, in source order. Blocks that fail `JSON.parse` are left out. */
export const ldBlocks = (doc: DocumentPort): { element: ElementPort; value: unknown }[] =>
  doc.querySelectorAll('script[type="application/ld+json" i]').flatMap((element) => {
    const parsed = parseLdJson(element);
    return parsed.ok ? [{ element, value: parsed.value }] : [];
  });

export const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** The values of every key that spells `term`, lists flattened, a JSON-LD `@list` unwrapped. */
export const values = (node: Record<string, unknown>, term: RegExp): unknown[] =>
  Object.entries(node)
    .filter(([key]) => term.test(key))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .flatMap((value) => (isObject(value) && Array.isArray(value["@list"]) ? value["@list"] : [value]));

/** A non-empty text value: a string, a `{"@value": …}` object, or a list holding one. */
export const hasText = (value: unknown): boolean =>
  typeof value === "string"
    ? value.trim() !== ""
    : Array.isArray(value)
      ? value.some(hasText)
      : isObject(value) && hasText(value["@value"]);

/** The `@id`s of every node on the page that carries one of the `term` properties as text. */
export const idsWithText = (blocks: readonly { value: unknown }[], term: RegExp): Set<string> => {
  const ids = new Set<string>();
  for (const { value } of blocks) {
    eachNode(value, (node) => {
      if (typeof node["@id"] === "string" && values(node, term).some(hasText)) ids.add(node["@id"]);
    });
  }
  return ids;
};
