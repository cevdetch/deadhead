/**
 * The try page's logic, kept out of the page so Node can test it: lint pasted
 * HTML with the CLI's own path (`packages/cli/source.ts`, parse5 included) and
 * shape the result for display. Nothing here touches the DOM.
 */
import { analyseSource, lintSource } from "../../../packages/cli/source.ts";
import type { CompiledRules, Finding } from "../../../packages/core/index.ts";
import type { Severity } from "../../../packages/core/vocabulary.ts";

export type ViewFinding = {
  line: number | null;
  col: number | null;
  ruleId: string;
  severity: Severity;
  possible: boolean;
  message: string;
  replacement: string;
  url: string;
  snippet: string;
  detail: string | null;
  fixable: boolean;
};

export type LintView = {
  findings: ViewFinding[];
  counts: Record<Severity, number>;
  fixed: number;
  output: string;
};

const view = (finding: Finding): ViewFinding => ({
  line: finding.loc?.line ?? null,
  col: finding.loc?.col ?? null,
  ruleId: finding.ruleId,
  severity: finding.severity,
  possible: finding.possible,
  message: finding.message,
  replacement: finding.replacement,
  url: finding.url,
  snippet: finding.node.snippet,
  detail: finding.detail ?? null,
  fixable: finding.fix !== null,
});

/**
 * Findings as the CLI reports them, each marked with whether `--fix` removes
 * it, and the HTML `--fix` would write. The first pass runs with fixes on so
 * each finding carries its edit; `lintSource` runs the full fix loop.
 */
export function lintHtml(html: string, compiled: CompiledRules): LintView {
  const findings = analyseSource(html, compiled, { fix: true }).map(view);
  const { output, fixed } = lintSource(html, "input.html", compiled, { fix: true });
  const counts: Record<Severity, number> = { harmful: 0, deprecated: 0, unnecessary: 0 };
  for (const finding of findings) counts[finding.severity]++;
  return { findings, counts, fixed, output };
}

/**
 * Longest fragment the share button writes. Browsers accept far longer
 * addresses, but chat apps and issue trackers truncate long links; past this
 * the page says so instead of handing out a broken link.
 */
export const SHARE_LIMIT = 16_000;

const PREFIX = "#html=";

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

/** The pasted HTML as a link fragment: deflate-raw, then base64url. Nothing leaves the browser. */
export async function encodeShare(html: string): Promise<string> {
  return PREFIX + toBase64Url(await pipe(new TextEncoder().encode(html), new CompressionStream("deflate-raw")));
}

/** The HTML a fragment carries, or null when it carries none or cannot be read. */
export async function decodeShare(fragment: string): Promise<string | null> {
  if (!fragment.startsWith(PREFIX)) return null;
  const payload = fragment.slice(PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(await pipe(fromBase64Url(payload), new DecompressionStream("deflate-raw")));
  } catch {
    return null;
  }
}
