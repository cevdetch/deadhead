import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { USER_AGENT } from "./fetch.ts";

/** Rendered DOMs past this are dropped as a failed render. */
const DOM_CAP = 64 * 1024 * 1024;

/** Running Chromium process groups and their profiles, for stopAll(). */
const live = new Map<number, string>();

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

/** Kill a Chromium and every helper it started: they share its process group. */
const killGroup = (pid: number | undefined): void => {
  if (pid === undefined) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // The group is already gone.
  }
};

/** Kill every running render and delete its profile. For SIGINT and SIGTERM handlers. */
export function stopAll(): void {
  for (const [pid, profile] of live) {
    killGroup(pid);
    rmSync(profile, { recursive: true, force: true });
  }
  live.clear();
}

/**
 * Run Chromium in its own process group and collect stdout. Helpers (zygote,
 * renderers) outlive the main process and keep writing into the profile, so
 * the group is killed when the main process exits or the time runs out.
 */
function dumpDom(binary: string, url: string, profile: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, chromiumArgs(url, profile), { detached: true, stdio: ["ignore", "pipe", "ignore"] });
    let failure: Error | null = null;
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => {
      failure ??= new Error(`timed out after ${timeoutMs} ms`);
      killGroup(child.pid);
    }, timeoutMs);
    if (child.pid !== undefined) live.set(child.pid, profile);
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size <= DOM_CAP) chunks.push(chunk);
      else {
        failure ??= new Error(`DOM over ${DOM_CAP} bytes`);
        killGroup(child.pid);
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code, signal) => {
      killGroup(child.pid);
      if (code !== 0) failure ??= new Error(`chromium exited with ${code ?? signal}`);
    });
    child.on("close", () => {
      clearTimeout(timer);
      if (child.pid !== undefined) live.delete(child.pid);
      if (failure === null) resolve(Buffer.concat(chunks).toString("utf8"));
      else reject(failure);
    });
  });
}

/** The rendered DOM of `url`, or the error. Binary from `options.binary`, `$CHROMIUM`, or `chromium`. */
export async function render(
  url: string,
  options: { binary?: string; timeoutMs?: number } = {},
): Promise<{ dom: string | null; error: string | null; ms: number }> {
  const start = performance.now();
  const profile = await mkdtemp(join(tmpdir(), "deadhead-chromium-"));
  try {
    const dom = await dumpDom(options.binary ?? process.env["CHROMIUM"] ?? "chromium", url, profile, options.timeoutMs ?? 45_000);
    return { dom, error: null, ms: Math.round(performance.now() - start) };
  } catch (error) {
    return { dom: null, error: (error instanceof Error ? error.message : String(error)).slice(0, 300), ms: Math.round(performance.now() - start) };
  } finally {
    // A failed cleanup leaves a directory in the temp dir; it must not fail the visit.
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  }
}
