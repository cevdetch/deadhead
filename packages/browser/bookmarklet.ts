/**
 * The bookmarklet's entry point: run the rules against the live document and
 * draw the results over the page.
 *
 * Exported as `start(payload, logic)` rather than running on import, so the
 * build can append one call with the compressed rule set inlined. That is what keeps the artifact a
 * single IIFE with no `fetch` — nothing to load means there is no request for
 * a Content-Security-Policy to block, which is exactly the kind of page most
 * worth pointing this at.
 */

import { type Rule, run } from "../core/index.ts";
import type { CheckFn, Finding, MatchFn, RuleMeta } from "../core/index.ts";
import { fromDocument } from "./adapter.ts";

const HOST = "deadhead-panel";

/**
 * Styles for the shadow root. The shadow boundary keeps the page's CSS out
 * and ours in, so no `all: initial` resets are needed. They are applied as a
 * constructed stylesheet through adoptedStyleSheets, which a page's
 * `style-src` does not govern, unlike a `<style>` element.
 *
 * The panel is light, so it pins `color-scheme: light`. A page declaring
 * `<meta name="color-scheme" content="dark light">` otherwise turns the
 * browser's default colours (button text, scrollbars) light-on-white in dark
 * mode.
 */
const PANEL_CSS = `
:host{all:initial;position:fixed;top:12px;right:12px;z-index:2147483647}
section{max-height:calc(100vh - 24px);width:min(30rem,calc(100vw - 24px));overflow:auto;color-scheme:light;
 background:#fff;color:#111;border:1px solid #d0d0d0;border-radius:8px;
 box-shadow:0 8px 32px rgba(0,0,0,.24);font:13px/1.5 ui-sans-serif,system-ui,sans-serif}
header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.6rem .8rem;
 border-bottom:1px solid #e6e6e6;position:sticky;top:0;background:#fff}
h1{margin:0;font-weight:600;font-size:13px}
button{font:inherit;color:inherit;cursor:pointer;padding:.1rem .45rem;border:1px solid #d0d0d0;border-radius:4px;background:#fff}
ol{list-style:none;padding:0;margin:0}
li{padding:.6rem .8rem;border-bottom:1px solid #f0f0f0}
.sev{display:inline-block;padding:0 .4em;border-radius:3px;color:#fff;font:11px/1.6 ui-monospace,monospace}
.sev.harmful{background:#d7263d}.sev.deprecated{background:#e08700}.sev.unnecessary{background:#2d7dd2}
code{font:11px/1.6 ui-monospace,monospace;color:#555}
p{margin:.35rem 0}.fix{color:#1a7f37}
a{display:block;color:#2d7dd2;font:11px/1.6 ui-monospace,monospace}
`;

/** One element with text, built without innerHTML (Trusted Types forbid it). */
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
};

function render(findings: Finding[]): HTMLElement {
  document.querySelector(HOST)?.remove();
  const host = document.createElement(HOST);
  const root = host.attachShadow({ mode: "open" });
  // A page without CSSStyleSheet construction still gets a working, unstyled
  // panel: better than failing on exactly the old browsers worth auditing.
  if (typeof CSSStyleSheet === "function" && "adoptedStyleSheets" in root) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(PANEL_CSS);
    root.adoptedStyleSheets = [sheet];
  }

  const panel = el("section");
  const header = el("header");
  header.append(
    el("h1", findings.length === 0 ? "deadhead: nothing to cut" : `deadhead: ${findings.length} finding${findings.length === 1 ? "" : "s"}`),
  );
  const close = el("button", "close");
  close.addEventListener("click", () => host.remove());
  header.append(close);
  panel.append(header);

  if (findings.length === 0) {
    panel.append(el("p", "No harmful, deprecated or unnecessary markup found in this document."));
  } else {
    const list = el("ol");
    for (const finding of findings) {
      const item = el("li");
      item.append(
        el("span", `${finding.severity}${finding.possible ? " · possible" : ""}`, `sev ${finding.severity}`),
        document.createTextNode(" "),
        el("code", finding.ruleId),
        el("p", finding.message),
        el("p", finding.replacement, "fix"),
      );
      const link = el("a", finding.url);
      link.href = finding.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      item.append(link);
      list.append(item);
    }
    panel.append(list);
  }

  root.append(panel);
  // SVG and XML documents have no body; the root element takes the host.
  (document.body ?? document.documentElement).append(host);
  return host;
}

/** Base64 of gzip of the slim rule metadata: about a fifth of the literal JSON. */
async function inflate(payload: string): Promise<unknown> {
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}

export async function start(payload: string, logic: Record<string, MatchFn | CheckFn>): Promise<Finding[]> {
  // The payload leaves out `fix`: only `computeFix` reads it, and the
  // bookmarklet build swaps that for a stub returning null.
  const metas = (await inflate(payload)) as RuleMeta[];
  const rules: Rule[] = metas.map((meta) => {
    const fn = logic[meta.ruleId];
    // A module exporting only `fixable` inlines nothing: the DOM has no source
    // text and never fixes, so the rule runs on its selector alone, the way
    // the literal build nulled `match` for it.
    if (fn === undefined) return meta.kind === "element" ? { meta: { ...meta, match: null } } : { meta };
    return meta.kind === "document" ? { meta, check: fn as CheckFn } : { meta, match: fn as MatchFn };
  });
  const findings = run(rules, fromDocument(document));
  render(findings);
  return findings;
}

// Not here yet: highlighting the offending element when you hover a row. It
// needs `Finding` to carry a handle back to the node, which the port does not
// expose and the CLI would have to leave null the way it leaves `range`. That
// is a change to a shared contract, so it belongs in its own pass rather than
// smuggled in behind a bookmarklet.
