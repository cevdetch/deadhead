import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Worker } from "node:worker_threads";
import test from "node:test";
import { runWorkerJobs, type WorkerJob } from "../packages/cli/worker-jobs.ts";

class FakeWorker extends EventEmitter {
  mode: "reply" | "exit" | "error" | "post-error" | "pending";
  terminated = false;

  constructor(mode: FakeWorker["mode"]) {
    super();
    this.mode = mode;
  }

  postMessage(): void {
    if (this.mode === "post-error") throw new Error("postMessage failed");
    queueMicrotask(() => {
      if (this.mode === "reply") {
        this.emit("message", []);
        this.emit("exit", 0);
      }
      if (this.mode === "exit") this.emit("exit", 0);
      if (this.mode === "error") this.emit("error", new Error("worker failed"));
    });
  }

  async terminate(): Promise<number> {
    this.terminated = true;
    this.emit("exit", 1);
    return 1;
  }
}

const url = new URL("../packages/cli/worker.ts", import.meta.url);
const job: WorkerJob = { files: ["a.html"], settings: {}, options: {} };
const asWorker = (worker: FakeWorker): Worker => worker as unknown as Worker;

test("exit zero without a reply rejects instead of leaving a pending job", { timeout: 3_000 }, async () => {
  const worker = new FakeWorker("exit");
  await assert.rejects(runWorkerJobs(url, [job], () => asWorker(worker)), /exited.*0.*before.*report/);
  assert.equal(worker.terminated, true);
});

test("a reply followed by exit succeeds and terminates its worker", async () => {
  const worker = new FakeWorker("reply");
  assert.deepEqual(await runWorkerJobs(url, [job], () => asWorker(worker)), [[]]);
  assert.equal(worker.terminated, true);
});

for (const mode of ["error", "post-error"] as const) {
  test(`${mode} preserves its cause and terminates a pending sibling`, { timeout: 3_000 }, async () => {
    const workers = [new FakeWorker(mode), new FakeWorker("pending")];
    let created = 0;
    await assert.rejects(
      runWorkerJobs(url, [job, job], () => asWorker(workers[created++]!)),
      mode === "error" ? /worker failed/ : /postMessage failed/,
    );
    assert.ok(workers.every(worker => worker.terminated));
  });
}

test("constructor failure terminates workers created before it", { timeout: 3_000 }, async () => {
  const worker = new FakeWorker("pending");
  let created = 0;
  await assert.rejects(runWorkerJobs(url, [job, job], () => {
    if (created++ === 0) return asWorker(worker);
    throw new Error("constructor failed");
  }), /constructor failed/);
  assert.equal(worker.terminated, true);
});

test("cleanup failure keeps the original error and still terminates siblings", { timeout: 3_000 }, async () => {
  const workers = [new FakeWorker("error"), new FakeWorker("pending")];
  workers[0]!.terminate = async () => {
    workers[0]!.terminated = true;
    throw new Error("termination failed");
  };
  let created = 0;
  await assert.rejects(
    runWorkerJobs(url, [job, job], () => asWorker(workers[created++]!)),
    /worker failed/,
  );
  assert.ok(workers.every(worker => worker.terminated));
});

test("a real worker exiting before its report rejects", { timeout: 5_000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "dh-worker-exit-"));
  try {
    const path = join(dir, "exit.mjs");
    await writeFile(path, "process.exit(0);\n");
    await assert.rejects(runWorkerJobs(pathToFileURL(path), [job]), /exited.*0.*before.*report/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
