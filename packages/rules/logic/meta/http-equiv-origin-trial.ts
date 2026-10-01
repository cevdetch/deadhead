import type { CheckFn } from "../../types.ts";
import { stripAsciiWhitespace } from "../../lib/text.ts";

/** A decoded Chromium token's feature and expiry (Unix seconds). */
type Trial = { feature: string; expiry: number };

/**
 * Chromium's token layout (`trial_token.cc`): a version byte (2 or 3), a
 * 64-byte signature, a 4-byte big-endian payload length, then the JSON
 * payload. Anything else returns null: Firefox enrolls from the same tag, and
 * its tokens need not follow this layout.
 * https://github.com/chromium/chromium/blob/main/third_party/blink/common/origin_trials/trial_token.cc
 */
const decode = (token: string): Trial | null => {
  let bytes: string;
  try {
    bytes = atob(token);
  } catch {
    return null;
  }
  const version = bytes.charCodeAt(0);
  if ((version !== 2 && version !== 3) || bytes.length < 69) return null;
  const length = ((bytes.charCodeAt(65) << 24) | (bytes.charCodeAt(66) << 16) | (bytes.charCodeAt(67) << 8) | bytes.charCodeAt(68)) >>> 0;
  if (length !== bytes.length - 69) return null;
  try {
    const payload: unknown = JSON.parse(bytes.slice(69));
    if (typeof payload !== "object" || payload === null) return null;
    const { feature, expiry } = payload as Record<string, unknown>;
    return typeof expiry === "number" && expiry > 0 ? { feature: typeof feature === "string" ? feature : "trial", expiry } : null;
  } catch {
    return null;
  }
};

/**
 * Chrome "ignores invalid or expired tokens" and uses the first valid one, so
 * a tag is dead weight when every token in it decodes and has expired. One
 * live or undecodable token keeps the tag quiet. The verdict reads the clock,
 * so a tag starts reporting on its expiry date with no change to the page.
 */
export const check: CheckFn = (doc, ctx) =>
  doc.querySelectorAll('meta[http-equiv*="origin-trial" i]').flatMap((element) => {
    if (stripAsciiWhitespace(element.attr("http-equiv") ?? "").toLowerCase() !== "origin-trial") return [];
    const tokens = (element.attr("content") ?? "").split(",").map(stripAsciiWhitespace).filter((token) => token !== "");
    const trials = tokens.map(decode);
    const now = Date.now() / 1000;
    if (trials.length === 0 || !trials.every((trial) => trial !== null && trial.expiry <= now)) return [];
    const detail = (trials as Trial[])
      .map(({ feature, expiry }) => `${feature} expired ${new Date(expiry * 1000).toISOString().slice(0, 10)}`)
      .join("; ");
    return [ctx.report(element, { detail })];
  });
