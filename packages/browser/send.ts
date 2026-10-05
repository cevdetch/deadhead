/**
 * The bookmarklet's "full report" button: read this page's HTML as its server
 * sent it and open it on the try page, in a new tab, inside the link fragment.
 * Only the click runs this; running the bookmarklet makes no request.
 */

import { SITE_URL } from "../core/vocabulary.ts";
import { encodeHandoff, HANDOFF_LIMIT, type Handoff } from "./handoff.ts";

/** What this uses of the window `window.open` returns; tests pass a plain object. */
export type Tab = { opener: unknown; location: { href: string }; close(): void };

export type Get = (url: string, init: RequestInit) => Promise<Response>;

/** The panel's host element. The bookmarklet appends it to the page; it is not the page's markup. */
export const PANEL = "deadhead-panel";

/** The document as HTML: its doctype, then the root element's markup, without the panel. */
export function serializeDocument(doc: Document): string {
  const root = doc.documentElement.cloneNode(true) as Element;
  for (const panel of root.querySelectorAll(PANEL)) panel.remove();
  const type = doc.doctype;
  if (type === null) return root.outerHTML;
  const ids = type.publicId
    ? ` PUBLIC "${type.publicId}"${type.systemId ? ` "${type.systemId}"` : ""}`
    : type.systemId
      ? ` SYSTEM "${type.systemId}"`
      : "";
  return `<!DOCTYPE ${type.name}${ids}>\n${root.outerHTML}`;
}

/**
 * The page's HTML. `force-cache` serves the copy the browser holds when it has
 * one, so the click rarely touches the network. A blocked request (a
 * `connect-src` without the page's origin, a `file:` page), an error status or
 * a redirect (a login wall is another document) falls back to the DOM.
 */
export async function readSource(doc: Document, href: string, get: Get): Promise<Pick<Handoff, "html" | "source">> {
  try {
    const response = await get(href, { credentials: "same-origin", cache: "force-cache" });
    if (response.ok && !response.redirected) {
      return { html: new TextDecoder(doc.characterSet).decode(await response.arrayBuffer()), source: "raw" };
    }
  } catch {
    // Fall through to the DOM.
  }
  return { html: serializeDocument(doc), source: "dom" };
}

/**
 * Send the page to the try page in `tab`, which the click handler opened
 * before any await: after one, browsers stop counting the click as a gesture
 * and block the tab. Returns null, or the message the panel shows.
 */
export async function sendToTry(doc: Document, href: string, get: Get, tab: Tab | null): Promise<string | null> {
  if (tab === null) return "The browser blocked the new tab. Allow pop-ups for this site, then click again.";
  tab.opener = null;
  try {
    const fragment = await encodeHandoff({ url: href, ...(await readSource(doc, href, get)) });
    if (fragment.length > HANDOFF_LIMIT) {
      tab.close();
      return `This page is too large for a link (${Math.ceil(fragment.length / 1000)} kB compressed). Save it and open the file on ${SITE_URL}/try.`;
    }
    tab.location.href = `${SITE_URL}/try${fragment}`;
    return null;
  } catch (error) {
    tab.close();
    return `Could not hand the page over: ${error instanceof Error ? error.message : String(error)}`;
  }
}
