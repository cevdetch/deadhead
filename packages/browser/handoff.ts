/**
 * Text in a link fragment: deflate-raw, then base64url. The try page's share
 * link and the bookmarklet's hand-off both use it. A browser never sends a
 * fragment to a server, so the HTML stays between the two tabs.
 *
 * Import-free: the site, the bookmarklet bundle and Node load it as is.
 */

/** Where a handed-over page's HTML came from: the server's bytes, or the DOM when re-reading them failed. */
export type Source = "raw" | "dom";

export type Handoff = { url: string; html: string; source: Source };

/** Longest `#page=` fragment the bookmarklet writes: under Firefox's cap of 1,048,576 characters per URL. */
export const HANDOFF_LIMIT = 1_000_000;
/** Bound decoded link data; opening a local HTML file remains unrestricted. */
export const MAX_TEXT_BYTES = 10 * 1024 * 1024;

const PAGE = "#page=";

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (text: string): Uint8Array => {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

// `new Uint8Array(bytes)` copies into a plain ArrayBuffer, the BlobPart the DOM types accept.
const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> =>
  new Uint8Array(await new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream)).arrayBuffer());

/** Text as base64url of its deflate-raw bytes. */
export async function pack(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > MAX_TEXT_BYTES) throw new RangeError("HTML in a link is limited to 10 MiB. Open a file instead.");
  return toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")));
}

/** The text `pack` made, or null when the payload is not one. */
export async function unpack(payload: string): Promise<string | null> {
  if (payload.length > HANDOFF_LIMIT || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  try {
    let size = 0;
    const bounded = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > MAX_TEXT_BYTES) throw new RangeError("link data exceeds the limit");
        controller.enqueue(chunk);
      },
    });
    const stream = new Blob([new Uint8Array(fromBase64Url(payload))]).stream()
      .pipeThrough(new DecompressionStream("deflate-raw")).pipeThrough(bounded);
    return new TextDecoder("utf-8", { fatal: true }).decode(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

/** A page as a `#page=` fragment. */
export async function encodeHandoff(page: Handoff): Promise<string> {
  return PAGE + (await pack(JSON.stringify(page)));
}

/** The page a `#page=` fragment carries, or null when it carries none or a malformed one. */
export async function decodeHandoff(fragment: string): Promise<Handoff | null> {
  if (!fragment.startsWith(PAGE)) return null;
  const text = await unpack(fragment.slice(PAGE.length));
  if (text === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const { url, html, source } = value as Record<string, unknown>;
  if (typeof url !== "string" || typeof html !== "string" || (source !== "raw" && source !== "dom")) return null;
  return { url, html, source };
}
