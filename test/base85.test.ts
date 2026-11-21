import assert from "node:assert/strict";
import test from "node:test";

import { decode85, encode85 } from "../packages/browser/base85.ts";

test("base85 round-trips every length and byte value", () => {
  for (let length = 0; length <= 13; length++) {
    for (const fill of [0, 1, 127, 128, 255]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (fill + i * 37) & 255);
      assert.deepEqual(decode85(encode85(bytes)), bytes, `length ${length}, fill ${fill}`);
    }
  }
  const random = Uint8Array.from({ length: 4099 }, () => Math.floor(Math.random() * 256));
  assert.deepEqual(decode85(encode85(random)), random);
});

test("base85 output needs no escaping in a javascript: URL or a JS string", () => {
  const all = encode85(Uint8Array.from({ length: 1024 }, (_, i) => (i * 97) & 255));
  assert.doesNotMatch(all, /["#%\\\s]/);
  assert.equal(encode85(Uint8Array.from([255, 255, 255, 255])).length, 5);
  assert.equal(encode85(new Uint8Array(400)).length, 500, "a quarter larger, not a third");
});
