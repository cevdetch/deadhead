import { WALL_STATUS } from "./classify.ts";
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
  if (code === "ETIMEDOUT" || (code.startsWith("UND_ERR_") && code.endsWith("TIMEOUT"))) return "timeout";
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

/** A fetch failure as text. Some causes, such as an AggregateError, have no message: their code stands in. */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (!(cause instanceof Error)) return error.message;
  const code = (cause as { code?: unknown }).code;
  return `${error.message}: ${cause.message || (typeof code === "string" ? code : cause.name)}`;
}

type Attempt = Pick<FetchResult, "finalUrl" | "status" | "contentType" | "bytes" | "truncated" | "error" | "errorMessage" | "body">;

async function attempt(target: string, headers: Record<string, string>, timeoutMs: number): Promise<Attempt> {
  try {
    const res = await fetch(target, { headers, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
    const { body, truncated } = await readCapped(res);
    const contentType = res.headers.get("content-type");
    return { finalUrl: res.url, status: res.status, contentType, bytes: body.byteLength, truncated, error: null, errorMessage: null, body };
  } catch (error) {
    const empty = { finalUrl: null, status: null, contentType: null, bytes: 0, truncated: false, body: null };
    return { ...empty, error: errorKind(error), errorMessage: describeError(error).slice(0, 300) };
  }
}

const NO_SITE = new Set(["dns", "connect", "tls"]);

/**
 * robots.txt, then the home page: the apex first, then `www.` once unless the
 * apex answered with a page or a wall (401, 403, 429), where `www.` shows the
 * same. The record keeps the first OK answer, else any answer, else an error
 * that shows the host exists, else the apex's error. The body is kept as bytes.
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
  const attempts: Attempt[] = [];
  for (const host of hosts) {
    const target = url(host, "/");
    result.tried.push(target);
    const answer = await attempt(target, headers, options.timeoutMs ?? 15_000);
    attempts.push(answer);
    if (answer.status !== null && (answer.status < 400 || WALL_STATUS.has(answer.status))) break;
  }
  const chosen =
    attempts.find((a) => a.status !== null && a.status < 400) ??
    attempts.find((a) => a.status !== null) ??
    attempts.find((a) => a.error !== null && !NO_SITE.has(a.error)) ??
    attempts[0];
  if (chosen !== undefined) Object.assign(result, chosen);
  result.ms.raw = Math.round(performance.now() - rawStart);
  return result;
}
