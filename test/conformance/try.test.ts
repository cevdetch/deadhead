import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { parseHTML } from "linkedom";

const PAGE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page</title><meta name="keywords" content="x"></head><body></body></html>';

test("try page handles clipboard and file failures, then recovers", async () => {
  const { document, window } = parseHTML('<html><body><form id="try-form"><textarea id="try-input"></textarea><button id="try-lint" type="button"></button><input id="try-file"></form><button id="try-share"></button><section id="try-report"><p id="try-from"></p><p id="try-status"></p><div id="try-results"></div><details id="try-fixed"><textarea id="try-output"></textarea><button id="try-copy"></button></details></section></body></html>');
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
    assert.equal(input.value, "", "an unreadable link does not leave other HTML posing as its content");
    input.value = PAGE;
    const click = async (id: string) => { document.getElementById(id)!.dispatchEvent(new window.Event("click")); await setImmediate(); await setImmediate(); };
    const report = document.getElementById("try-report")!;
    report.style.minHeight = "100svh";
    await click("try-lint");
    assert.match(report.style.minHeight, /^0(px)?$/, "a run the reader starts releases the reserved report height");
    await click("try-copy");
    assert.match(status.textContent!, /copy.*manually/);
    denied = false;
    await click("try-copy");
    assert.equal(copied.includes('name="keywords"'), false);
    assert.match(status.textContent!, /^1 finding .* remaining\. Checked as a page\. HTML copied\.$/, "copy feedback keeps the report summary");
    input.dispatchEvent(new window.Event("input"));
    assert.match(status.textContent!, /^1 finding .* Checked as a page\. Edited since this report\. Press Lint to update\.$/, "an edit marks the report stale");
    const file = document.getElementById("try-file")!;
    Object.defineProperty(file, "files", { value: [{ async text() { throw new Error("unreadable"); } }], configurable: true });
    file.dispatchEvent(new window.Event("change"));
    await setImmediate();
    assert.match(status.textContent!, /Could not read this file/);
    assert.equal(input.value, PAGE);
    await click("try-lint");
    assert.match(status.textContent!, /1 finding/);
    const submit = () => click("try-lint");
    const from = document.getElementById("try-from")!;
    input.value = "<p>pasted</p>";
    Object.defineProperty(file, "files", { value: [{ name: "page.html", async text() { return PAGE.replace("<title>Page", "<title>Opened"); } }], configurable: true });
    file.dispatchEvent(new window.Event("change"));
    await setImmediate();
    await setImmediate();
    assert.match(input.value, /<title>Opened/);
    assert.equal(from.hidden, false);
    assert.equal(from.textContent, "Opened page.html.", "opening a file says what replaced the HTML");
    assert.doesNotMatch(status.textContent!, /Edited since/, "a fresh report is not stale");
    input.value = '<meta name="keywords" content="x">';
    await submit();
    assert.match(status.textContent!, /Checked as a fragment\.$/, "a fragment says so");
    input.value = " \n";
    await submit();
    assert.equal(status.textContent, "Nothing to check. Paste HTML or open a file.", "empty input is not reported as clean");
    assert.equal(document.getElementById("try-results")!.childNodes.length, 0);
    Object.defineProperty(input, "value", { get() { throw new Error("parser exploded"); }, configurable: true });
    await submit();
    assert.equal(status.textContent, "Could not check this HTML: parser exploded. Try the CLI.", "a failed check names its cause");
  } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
