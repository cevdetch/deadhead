/** Observe HTML without holding up streamed writes or changing their backpressure. */
import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from "node:http";

const MAX_BYTES = 2 * 1024 * 1024;
const CHANGED_HEADERS = ["content-length", "etag", "content-md5", "digest", "content-digest", "repr-digest"];

function isHtml(res: ServerResponse): boolean {
  const type = String(res.getHeader("content-type") ?? "");
  const charset = /;\s*charset\s*=\s*"?([^;"\s]+)/i.exec(type)?.[1];
  const length = Number(res.getHeader("content-length"));
  return res.statusCode >= 200 && res.statusCode < 300 && ![204, 205, 206].includes(res.statusCode) &&
    /^text\/html(?:\s*;|\s*$)/i.test(type) &&
    (charset === undefined || /^utf-?8$/i.test(charset)) &&
    /^(?:identity)?$/i.test(String(res.getHeader("content-encoding") ?? "")) &&
    res.getHeader("content-range") === undefined &&
    !/\bno-transform\b/i.test(String(res.getHeader("cache-control") ?? "")) &&
    !(length > MAX_BYTES);
}

/** The returned script contains only report data; never the page's HTML. */
export function observeHtml(
  req: IncomingMessage,
  res: ServerResponse,
  browserConsole: boolean,
  report: (html: string) => string,
): void {
  if (req.method !== "GET") return;
  const write = res.write.bind(res);
  const end = res.end.bind(res);
  const writeHead = res.writeHead.bind(res);
  let prepared = false;
  let eligible = false;
  let inject = false;
  let size = 0;
  let chunks: Buffer[] = [];

  const prepare = () => {
    if (prepared) return;
    prepared = true;
    eligible = isHtml(res);
    inject = eligible && browserConsole && !res.headersSent && !res.strictContentLength;
    if (inject) for (const name of CHANGED_HEADERS) res.removeHeader(name);
  };
  const collect = (chunk: unknown, encoding?: BufferEncoding) => {
    if (!eligible || chunk === undefined || chunk === null || typeof chunk === "function") return;
    const length = typeof chunk === "string" ? Buffer.byteLength(chunk, encoding) :
      chunk instanceof Uint8Array ? chunk.byteLength : 0;
    if (length === 0) return;
    size += length;
    if (size > MAX_BYTES) {
      eligible = false;
      chunks = [];
    } else chunks.push(typeof chunk === "string" ? Buffer.from(chunk, encoding) : Buffer.from(chunk as Uint8Array));
  };

  // Frameworks can put headers directly in writeHead rather than setHeader.
  // Stage those first, so eligibility and length removal see the final values.
  res.writeHead = (statusCode, statusMessageOrHeaders?: string | OutgoingHttpHeaders | (string | number | string[])[], headers?: OutgoingHttpHeaders | (string | number | string[])[]) => {
    const fields = typeof statusMessageOrHeaders === "string" ? headers : statusMessageOrHeaders;
    if (Array.isArray(fields)) {
      const combined = new Map<string, (string | number | string[])[]>();
      for (let i = 0; i < fields.length; i += 2) {
        const value = fields[i + 1];
        const name = String(fields[i]).toLowerCase();
        if (value !== undefined) combined.set(name, [...(combined.get(name) ?? []), value]);
      }
      for (const [name, values] of combined) res.setHeader(name, values.flat().map(String));
    } else if (fields !== undefined) {
      for (const [name, value] of Object.entries(fields)) if (value !== undefined) res.setHeader(name, value);
    }
    res.statusCode = statusCode;
    prepare();
    return typeof statusMessageOrHeaders === "string" ? writeHead(statusCode, statusMessageOrHeaders) : writeHead(statusCode);
  };

  // Forward Node's callback/encoding overloads. collect ignores callbacks and
  // copies bytes before the caller can reuse a buffer. The original write's
  // boolean and drain events pass through.
  res.write = (chunk: unknown, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void) => {
    prepare();
    collect(chunk, typeof encodingOrCallback === "string" ? encodingOrCallback : undefined);
    return typeof encodingOrCallback === "string" ? write(chunk, encodingOrCallback, callback) : write(chunk, encodingOrCallback ?? callback);
  };
  res.end = (chunkOrCallback?: unknown, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void) => {
    prepare();
    collect(chunkOrCallback, typeof encodingOrCallback === "string" ? encodingOrCallback : undefined);
    if (eligible) {
      const script = report(Buffer.concat(chunks).toString("utf8"));
      chunks = [];
      if (inject && script !== "") {
        // Forward the last application chunk, then append after the complete
        // document. This also works with streamed HTML and needs no body-tag
        // regex that could match text inside a script or comment.
        if (chunkOrCallback !== undefined && typeof chunkOrCallback !== "function") {
          if (typeof encodingOrCallback === "string") write(chunkOrCallback, encodingOrCallback);
          else write(chunkOrCallback);
        }
        const done = typeof chunkOrCallback === "function" ? chunkOrCallback as () => void :
          typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
        return end(script, "utf8", done);
      }
    }
    chunks = [];
    if (typeof chunkOrCallback === "function") return end(chunkOrCallback as () => void);
    return typeof encodingOrCallback === "string" ? end(chunkOrCallback, encodingOrCallback, callback) : end(chunkOrCallback, encodingOrCallback ?? callback);
  };
  res.once("close", () => { chunks = []; });
}
