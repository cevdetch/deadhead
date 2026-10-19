import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { parseHTML } from "linkedom";
import { encodeHandoff } from "../../packages/browser/handoff.ts";
import { loadRuntimeRules } from "../../packages/rules/load.ts";
import { encodeShare } from "../../site/src/lib/playground.ts";

const PAGE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page</title><meta name="keywords" content="x"></head><body></body></html>';
type Dom = Pick<ReturnType<typeof parseHTML>, "document" | "window">;
let visit = 0;

async function withPage(fragment: string, check: (page: Dom & { location: URL }) => Promise<void>): Promise<void> {
  const { document, window } = parseHTML('<html><body><form id="try-form"><textarea id="try-input"></textarea><input id="try-file"></form><button id="try-share"></button><p id="try-status"></p><div id="try-results"></div><details id="try-fixed" hidden><textarea id="try-output"></textarea><button id="try-copy"></button></details><p id="try-from" hidden></p></body></html>');
  const location = new URL("https://deadhead.cevdet.ch/try" + fragment);
  const globals: Record<string, unknown> = {
    document, location,
    navigator: { clipboard: { async writeText() {} } },
    history: { replaceState(_state: unknown, _unused: string, url: string) { location.href = new URL(url, location).href; } },
  };
  const previous = new Map(Object.keys(globals).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  try {
    for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { value, configurable: true });
    (document.getElementById("try-input") as HTMLTextAreaElement).value = PAGE;
    await loadRuntimeRules();
    await import(`../../site/src/scripts/try.ts?startup=${visit++}`);
    await check({ document, window, location });
  } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
}

test("the first visit opens the example report automatically", async () => {
  await withPage("", async ({ document, window }) => {
    assert.match(document.getElementById("try-status")!.textContent!, /1 automatically fixed · 0 remaining/);
    assert.equal(document.querySelectorAll("#try-results li").length, 1);
    assert.equal((document.getElementById("try-fixed") as HTMLDetailsElement).hidden, false);
    document.getElementById("try-form")!.dispatchEvent(new window.Event("submit", { cancelable: true }));
    await setImmediate();
    await setImmediate();
    assert.match(document.getElementById("try-status")!.textContent!, /1 automatically fixed · 0 remaining/);
    assert.equal(document.querySelectorAll("#try-results li").length, 1);
  });
});

test("a shared HTML link still opens its report automatically", async () => {
  await withPage(await encodeShare(PAGE), async ({ document }) => {
    assert.match(document.getElementById("try-status")!.textContent!, /1 automatically fixed · 0 remaining/);
    assert.doesNotMatch((document.getElementById("try-output") as HTMLTextAreaElement).value, /name="keywords"/);
  });
});

test("a bookmarklet handoff still opens its report and clears the fragment", async () => {
  const fragment = await encodeHandoff({ url: "https://example.org/", html: PAGE, source: "raw" });
  await withPage(fragment, async ({ document, location }) => {
    assert.equal(location.hash, "");
    assert.match(document.getElementById("try-from")!.textContent!, /https:\/\/example.org\//);
    assert.match(document.getElementById("try-status")!.textContent!, /1 automatically fixed · 0 remaining/);
  });
});
