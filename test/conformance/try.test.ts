import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { parseHTML } from "linkedom";

const PAGE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page</title><meta name="keywords" content="x"></head><body></body></html>';

test("try page handles clipboard and file failures, then recovers", async () => {
  const { document, window } = parseHTML('<html><body><form id="try-form"><textarea id="try-input"></textarea><input id="try-file"></form><button id="try-share"></button><p id="try-status"></p><div id="try-results"></div><details id="try-fixed"><textarea id="try-output"></textarea><button id="try-copy"></button></details><p id="try-from"></p></body></html>');
  const location = new URL("https://deadhead.cevdet.ch/try#page=broken");
  let copied = "";
  let denied = true;
  const globals: Record<string, unknown> = {
    document, location,
    navigator: { clipboard: { async writeText(text: string) { if (denied) throw new Error("denied"); copied = text; } } },
    history: { replaceState(_state: unknown, _unused: string, url: string) { location.href = new URL(url, location).href; } },
  };
  const previous = new Map(Object.keys(globals).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  try {
    for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { value, configurable: true });
    const input = document.getElementById("try-input") as HTMLTextAreaElement;
    input.value = PAGE;
    await import("../../site/src/scripts/try.ts");
    const status = document.getElementById("try-status")!;
    assert.match(status.textContent!, /Could not read this link/);
    assert.equal(location.hash, "", "handed-over HTML never remains in the address bar");
    const click = async (id: string) => { document.getElementById(id)!.dispatchEvent(new window.Event("click")); await setImmediate(); await setImmediate(); };
    await click("try-copy");
    assert.match(status.textContent!, /copy.*manually/);
    denied = false;
    await click("try-copy");
    assert.equal(copied.includes('name="keywords"'), false);
    assert.equal(status.textContent, "Fixed HTML copied.");
    const file = document.getElementById("try-file")!;
    Object.defineProperty(file, "files", { value: [{ async text() { throw new Error("unreadable"); } }], configurable: true });
    file.dispatchEvent(new window.Event("change"));
    await setImmediate();
    assert.match(status.textContent!, /Could not read this file/);
    assert.equal(input.value, PAGE);
    document.getElementById("try-form")!.dispatchEvent(new window.Event("submit", { cancelable: true }));
    assert.match(status.textContent!, /1 finding/);
  } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
