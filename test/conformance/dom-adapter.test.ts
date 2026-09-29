import assert from "node:assert/strict";
import test from "node:test";

import { fromDocument } from "../../packages/browser/adapter.ts";

/**
 * An element that behaves like SVG in a real browser: getAttribute compares
 * names exactly. linkedom lowercases, so it cannot stand in for this case.
 */
const svgLike = (attrs: Record<string, string>): Element => {
  const list = Object.entries(attrs).map(([name, value]) => ({ name, value }));
  return {
    tagName: "svg",
    attributes: list,
    getAttribute: (name: string) => list.find((a) => a.name === name)?.value ?? null,
    hasAttribute: (name: string) => list.some((a) => a.name === name),
    getAttributeNames: () => list.map((a) => a.name),
    children: [],
    parentElement: null,
    parentNode: null,
    textContent: "",
  } as unknown as Element;
};

test("DOM port reads SVG attributes case-insensitively, as the port promises", () => {
  const root = svgLike({ viewBox: "0 0 1 1", baseProfile: "full" });
  const { roots: [port] } = fromDocument({ documentElement: root, doctype: null } as unknown as Document);
  assert.ok(port);
  assert.equal(port.attr("viewbox"), "0 0 1 1");
  assert.equal(port.attr("VIEWBOX"), "0 0 1 1");
  assert.equal(port.hasAttr("baseprofile"), true);
  assert.deepEqual(port.attrNames(), ["viewbox", "baseprofile"]);
});
