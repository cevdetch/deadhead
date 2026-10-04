import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { USER_AGENT } from "./fetch.ts";

const run = promisify(execFile);

/** Headless Chromium dumping the DOM after scripts ran; one throwaway profile per visit. */
export function chromiumArgs(url: string, profile: string, userAgent: string = USER_AGENT): string[] {
  return [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--mute-audio",
    `--user-data-dir=${profile}`,
    `--user-agent=${userAgent}`,
    "--virtual-time-budget=8000",
    "--dump-dom",
    url,
  ];
}

/** The rendered DOM of `url`, or the error. Binary from `options.binary`, `$CHROMIUM`, or `chromium`. */
export async function render(
  url: string,
  options: { binary?: string; timeoutMs?: number } = {},
): Promise<{ dom: string | null; error: string | null; ms: number }> {
  const start = performance.now();
  const profile = await mkdtemp(join(tmpdir(), "deadhead-chromium-"));
  try {
    const { stdout } = await run(options.binary ?? process.env["CHROMIUM"] ?? "chromium", chromiumArgs(url, profile), {
      timeout: options.timeoutMs ?? 45_000,
      killSignal: "SIGKILL",
      maxBuffer: 64 * 1024 * 1024,
    });
    return { dom: stdout, error: null, ms: Math.round(performance.now() - start) };
  } catch (error) {
    return { dom: null, error: (error instanceof Error ? error.message : String(error)).slice(0, 300), ms: Math.round(performance.now() - start) };
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}
