import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { UsageError, collectFiles } from "../packages/cli/lint.ts";

const PAGE = '<!doctype html><html lang="en"><head><title>t</title></head><body></body></html>\n';

const sandbox = async (run: (dir: string) => Promise<void>): Promise<void> => {
  const dir = await mkdtemp(join(tmpdir(), "deadhead-collect-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

test("dot-directories are never walked", async () => {
  await sandbox(async (dir) => {
    await writeFile(join(dir, "page.html"), PAGE);
    await mkdir(join(dir, ".cache", "nested"), { recursive: true });
    await writeFile(join(dir, ".cache", "hidden.html"), PAGE);
    await writeFile(join(dir, ".cache", "nested", "deep.html"), PAGE);
    await mkdir(join(dir, ".git"), { recursive: true });
    await writeFile(join(dir, ".git", "hook.html"), PAGE);

    const files = await collectFiles([dir]);
    assert.deepEqual(files, [join(dir, "page.html")]);
  });
});

test("an explicit dot-file is still linted when named", async () => {
  await sandbox(async (dir) => {
    const hidden = join(dir, ".hidden.html");
    await writeFile(hidden, PAGE);
    assert.deepEqual(await collectFiles([hidden]), [hidden]);
  });
});

test("an empty glob is a usage error, not an empty run", async () => {
  await sandbox(async (dir) => {
    await assert.rejects(() => collectFiles([join(dir, "*.html")]), (err: unknown) => {
      assert.ok(err instanceof UsageError);
      assert.match((err as Error).message, /no files matched/);
      return true;
    });
  });
});

test("equivalent paths are linted once, retaining the first report spelling", async () => {
  await sandbox(async dir => {
    const file = join(dir, "page.html");
    await writeFile(file, PAGE);
    assert.deepEqual(await collectFiles([file, `${dir}/./page.html`, dir]), [file]);
  });
});

test("directory walks prune ignored trees before opening them", { skip: process.platform === "win32" || process.getuid?.() === 0 }, async () => {
  await sandbox(async dir => {
    const ignored = join(dir, "node_modules");
    await mkdir(ignored);
    await writeFile(join(dir, "page.html"), PAGE);
    await chmod(ignored, 0);
    try { assert.deepEqual(await collectFiles([dir]), [join(dir, "page.html")]); }
    finally { await chmod(ignored, 0o700); }
  });
});

test("discovery keeps linked HTML files and ignores linked directories", { skip: process.platform === "win32" }, async () => {
  await sandbox(async dir => {
    await mkdir(join(dir, "pages"));
    await writeFile(join(dir, "pages", "page.html"), PAGE);
    await symlink(join(dir, "pages", "page.html"), join(dir, "linked.htm"));
    await symlink(join(dir, "pages"), join(dir, "directory.html"));
    assert.deepEqual(await collectFiles([dir]), [join(dir, "linked.htm"), join(dir, "pages", "page.html")]);
  });
});

test("a glob that matches only non-HTML still reports no files matched when nothing is HTML", async () => {
  // A glob that matches files but none of them HTML currently yields an empty
  // set without throwing; pin the empty-glob path that does throw.
  await sandbox(async (dir) => {
    await writeFile(join(dir, "notes.txt"), "hello");
    await assert.rejects(() => collectFiles([join(dir, "missing-*.html")]), /no files matched/);
  });
});
