import { disallowsRoot, TOKEN } from "./robots.ts";
import type { ErrorKind } from "./types.ts";

/** A current desktop Chrome string that names the project, so site owners can tell who visited. */
export const USER_AGENT = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 ${TOKEN} (+https://deadhead.cevdet.ch)`;

/** Bodies past this are cut; the record says so. */
export const BODY_CAP = 10 * 1024 * 1024;

/** Sort a fetch failure into the classes classify.ts needs. */
export function errorKind(error: unknown): ErrorKind {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "timeout";
  const cause = error instanceof Error ? (error.cause as { code?: unknown } | undefined) : undefined;
  const code = typeof cause?.code === "string" ? cause.code : "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "EAI_NONAME") return "dns";
  if (["ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH"].includes(code)) return "connect";
  if (code.startsWith("ERR_TLS") || code.startsWith("ERR_SSL") || code.includes("CERT")) return "tls";
  if (code.startsWith("UND_ERR_") && code.endsWith("TIMEOUT")) return "timeout";
  return "other";
}

/** Read a response body as bytes, stopping at `cap`. */
export async function readCapped(res: Response, cap: number = BODY_CAP): Promise<{ body: Buffer; truncated: boolean }> {
  if (res.body === null) return { body: Buffer.alloc(0), truncated: false };
  const chunks: Buffer[] = [];
  let size = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return { body: Buffer.concat(chunks), truncated: false };
    chunks.push(Buffer.from(value));
    size += value.byteLength;
    if (size > cap) {
      await reader.cancel();
      return { body: Buffer.concat(chunks).subarray(0, cap), truncated: true };
    }
  }
}

export type FetchOptions = {
  /** Builds the URL for a host and path; tests point it at 127.0.0.1. */
  url?: (host: string, path: string) => string;
  userAgent?: string;
  timeoutMs?: number;
  robotsTimeoutMs?: number;
};

export type FetchResult = {
  robots: "allowed" | "disallowed";
  tried: string[];
  finalUrl: string | null;
  status: number | null;
  contentType: string | null;
  bytes: number;
  truncated: boolean;
  error: ErrorKind | null;
  errorMessage: string | null;
  body: Buffer | null;
  ms: { robots: number; raw: number };
};

const message = (error: unknown): string =>
  error instanceof Error ? `${error.message}${error.cause instanceof Error ? `: ${error.cause.message}` : ""}` : String(error);

/**
 * robots.txt, then the home page: the apex first, `www.` once if the apex has
 * no DNS, refuses the connection or fails TLS. The body is kept as bytes.
 */
export async function fetchSite(domain: string, options: FetchOptions = {}): Promise<FetchResult> {
  const url = options.url ?? ((host: string, path: string) => `https://${host}${path}`);
  const headers = { "user-agent": options.userAgent ?? USER_AGENT, "accept-language": "en" };
  const result: FetchResult = {
    robots: "allowed",
    tried: [],
    finalUrl: null,
    status: null,
    contentType: null,
    bytes: 0,
    truncated: false,
    error: null,
    errorMessage: null,
    body: null,
    ms: { robots: 0, raw: 0 },
  };

  const robotsStart = performance.now();
  try {
    const res = await fetch(url(domain, "/robots.txt"), { headers, signal: AbortSignal.timeout(options.robotsTimeoutMs ?? 10_000) });
    if (res.ok && disallowsRoot(await res.text())) result.robots = "disallowed";
  } catch {
    // A missing or failing robots.txt allows.
  }
  result.ms.robots = Math.round(performance.now() - robotsStart);
  if (result.robots === "disallowed") return result;

  const rawStart = performance.now();
  const hosts = domain.startsWith("www.") ? [domain] : [domain, `www.${domain}`];
  for (const host of hosts) {
    const target = url(host, "/");
    result.tried.push(target);
    try {
      const res = await fetch(target, { headers, redirect: "follow", signal: AbortSignal.timeout(options.timeoutMs ?? 15_000) });
      const { body, truncated } = await readCapped(res);
      Object.assign(result, {
        finalUrl: res.url,
        status: res.status,
        contentType: res.headers.get("content-type"),
        bytes: body.byteLength,
        truncated,
        body,
        error: null,
        errorMessage: null,
      });
      break;
    } catch (error) {
      result.error = errorKind(error);
      result.errorMessage = message(error).slice(0, 300);
      if (result.error !== "dns" && result.error !== "connect" && result.error !== "tls") break;
    }
  }
  result.ms.raw = Math.round(performance.now() - rawStart);
  return result;
}
