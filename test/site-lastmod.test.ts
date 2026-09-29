import assert from "node:assert/strict";
import test from "node:test";

import { modifiedDate, newestCommitDates } from "../site/src/lib/lastmod.ts";

test("newestCommitDates keeps the first date seen per path: git log lists newest first", () => {
  const log = [
    "\u00002026-09-29",
    "",
    "content/rules/meta/google-value.md",
    "\u00002026-09-28",
    "",
    "content/rules/meta/google-value.md",
    "content/rules/meta/robots-value.md",
    "",
  ].join("\n");
  assert.deepEqual(
    [...newestCommitDates(log)],
    [
      ["content/rules/meta/google-value.md", "2026-09-29"],
      ["content/rules/meta/robots-value.md", "2026-09-28"],
    ],
  );
});

test("modifiedDate takes the later of pubDate and the newest commit", () => {
  assert.equal(modifiedDate("2026-09-28", "2026-09-29"), "2026-09-29");
  assert.equal(modifiedDate("2026-09-28", "2026-09-01"), "2026-09-28");
  assert.equal(modifiedDate("2026-09-28", undefined), "2026-09-28");
});
