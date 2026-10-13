import { Worker } from "node:worker_threads";
import type { RuleSetting } from "./config.ts";
import type { FileResult } from "./reporters/index.ts";
import type { LintOptions } from "./source.ts";

export type WorkerJob = {
  files: string[];
  settings: Record<string, RuleSetting>;
  options: LintOptions;
};

/** A report completes a job; an exit before that report is a failure. */
export async function runWorkerJobs(
  workerUrl: URL,
  jobs: WorkerJob[],
  createWorker: (url: URL) => Worker = (url) => new Worker(url),
): Promise<FileResult[][]> {
  const workers = new Set<Worker>();
  try {
    return await Promise.all(jobs.map(job => new Promise<FileResult[]>((resolve, reject) => {
      const worker = createWorker(workerUrl);
      workers.add(worker);
      let settled = false;
      const settle = (action: () => void): void => {
        if (settled) return;
        settled = true;
        action();
      };
      worker.once("message", (results: FileResult[]) => settle(() => resolve(results)));
      worker.once("error", error => settle(() => reject(error)));
      worker.once("exit", code => settle(() => reject(
        new Error(`lint worker exited with code ${code} before sending its report`),
      )));
      try {
        worker.postMessage(job);
      } catch (error) {
        settle(() => reject(error));
      }
    })));
  } finally {
    // Cleanup every sibling, even when one termination fails. Keep the cause
    // of the lint failure rather than replacing it with a cleanup error.
    await Promise.allSettled([...workers].map(async worker => worker.terminate()));
  }
}
