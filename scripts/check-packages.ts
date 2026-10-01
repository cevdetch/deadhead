#!/usr/bin/env node
/** Release checks per published package: lint the manifest and list exactly what would ship. */
import { execFileSync } from "node:child_process";
import { styleText } from "node:util";

const PACKAGES = ["packages/cli", "packages/eslint-plugin"];
const ALLOWED = /^(package\.json|README\.md|dist\/.+)$/;

let failed = false;
for (const dir of PACKAGES) {
  execFileSync("pnpm", ["exec", "publint", "--strict", dir], { stdio: "inherit" });
  const [pack] = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: dir, encoding: "utf8" })) as [
    { files: { path: string }[] },
  ];
  const paths = pack.files.map((f) => f.path);
  const stray = paths.filter((p) => !ALLOWED.test(p));
  if (stray.length > 0) {
    failed = true;
    process.stderr.write(`${dir} would ship unexpected files:\n  ${stray.join("\n  ")}\n`);
    continue;
  }
  process.stdout.write(`${styleText("green", "✓")} ${dir}: ${paths.length} files\n`);
}
process.exit(failed ? 1 : 0);
