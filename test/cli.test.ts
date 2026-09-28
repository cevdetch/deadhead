import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadRules } from "../packages/rules/load.ts";
import { collectFiles, lintFiles } from "../packages/cli/lint.ts";
import { ROOT, loadRules as loadMarkdown } from "../scripts/rules-source.ts";
import { parseSelector, tokenTests } from "../packages/core/selector.ts";
import { run } from "../packages/core/engine.ts";
import { applyFixes } from "../packages/core/fix.ts";
import { parseHtml } from "../packages/cli/adapter.ts";

const BIN = fileURLToPath(new URL("../packages/cli/bin/deadhead.ts", import.meta.url));

// rules.json is built once by `pnpm test` before any test process starts.

const deadhead = (...args: string[]) =>
  spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, encoding: "utf8" });

const rules = await loadRules();
const { rules: markdown } = await loadMarkdown();

// --- the rule set the CLI loads matches the rule set on disk ----------------

test("every rule in content/rules is loaded, with its logic module attached", () => {
  assert.equal(rules.length, markdown.length);
  for (const rule of rules) {
    if (rule.meta.kind === "document") {
      assert.equal(typeof rule.check, "function", `${rule.meta.ruleId} needs check()`);
    } else if (rule.meta.match === "logic") {
      assert.ok(
        typeof rule.match === "function" || typeof rule.fixable === "function",
        `${rule.meta.ruleId} needs match() or fixable()`,
      );
    }
  }
});

// --- fixtures actually behave the way their rule says they do ---------------

test("each invalid.html trips its own rule", async () => {
  for (const rule of rules) {
    const file = `test/fixtures/${rule.meta.ruleId}/invalid.html`;
    const [result] = (await lintFiles(await collectFiles([file]), rules)).results;
    const own = result?.findings.filter((f) => f.ruleId === rule.meta.ruleId) ?? [];
    assert.ok(own.length > 0, `${file} produced no ${rule.meta.ruleId} finding`);
    for (const finding of own) {
      assert.equal(finding.severity, rule.meta.severity);
      assert.equal(finding.url, `https://deadhead.cevdet.ch/rules/${rule.meta.ruleId}`);
      assert.ok(finding.loc !== null && finding.range !== null, "CLI findings carry positions");
    }
  }
});

test("each valid.html is clean, and clean of every rule, not just its own", async () => {
  const files = await collectFiles(["test/fixtures/*/*/valid.html"]);
  assert.equal(files.length, rules.length);
  const results = (await lintFiles(files, rules)).results;
  const findings = results.flatMap((r) => r.findings.map((f) => `${r.file}: ${f.ruleId}`));
  assert.deepEqual(findings, []);
});

test("meta/robots-value reads robots and every crawler name with published docs", () => {
  const robotsFindings = (name: string) =>
    run(rules, parseHtml(`<head><meta name="${name}" content="noindex, no-follow"></head>`)).filter(
      (f) => f.ruleId === "meta/robots-value",
    ).length;
  for (const name of ["robots", "googlebot", "googlebot-news", "GOOGLEBOT-NEWS", "bingbot", "yandex", "applebot"]) {
    assert.equal(robotsFindings(name), 1, name);
  }
  assert.equal(robotsFindings("description"), 0);
});

// --- exit codes are the contract CI depends on ------------------------------

test("exit 0 when nothing is found", () => {
  const run = deadhead("test/fixtures/*/*/valid.html");
  assert.equal(run.status, 0);
  assert.match(run.stdout, /no findings/);
});

test("exit 1 when the --fail-on threshold is met, 0 when it is not", () => {
  assert.equal(deadhead("test/fixtures").status, 1, "default threshold is any finding");
  assert.equal(deadhead("--fail-on=harmful", "test/fixtures/head").status, 1);
  // The type-javascript-mime fixtures are `unnecessary`, which is below a harmful threshold.
  assert.equal(deadhead("--fail-on=harmful", "test/fixtures/attr/script-type-javascript").status, 0);
  assert.equal(deadhead("--fail-on=none", "test/fixtures").status, 0);
});

test("exit 2 for usage and I/O errors, never 1", () => {
  assert.equal(deadhead().status, 2, "no arguments");
  assert.equal(deadhead("does-not-exist.html").status, 2);
  assert.equal(deadhead("--format=nope", "test/fixtures").status, 2);
  assert.equal(deadhead("--fail-on=nope", "test/fixtures").status, 2);
  assert.match(deadhead("--format=nope", "test/fixtures").stderr, /unknown --format/);
});

test("--help and --version exit 0 and write to stdout", async () => {
  const help = deadhead("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: deadhead/);

  const pkg: { version: string } = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const version = deadhead("--version");
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), pkg.version);
});

// --- reporters --------------------------------------------------------------

test("json output is parseable and its summary matches its findings", () => {
  const run = deadhead("--format=json", "test/fixtures");
  const report = JSON.parse(run.stdout) as {
    summary: { findings: number; harmful: number; deprecated: number; unnecessary: number };
    results: { file: string; findings: { ruleId: string }[] }[];
  };
  const counted = report.results.reduce((n, r) => n + r.findings.length, 0);
  assert.equal(report.summary.findings, counted);
  const { harmful, deprecated, unnecessary } = report.summary;
  assert.equal(harmful + deprecated + unnecessary, counted);
});

test("sarif output is parseable and declares every rule it references", () => {
  const run = deadhead("--format=sarif", "test/fixtures");
  const report = JSON.parse(run.stdout) as {
    version: string;
    runs: {
      tool: { driver: { rules: { id: string; helpUri: string }[] } };
      results: { ruleId: string; level: string; locations: unknown[] }[];
    }[];
  };
  assert.equal(report.version, "2.1.0");
  const first = report.runs[0];
  assert.ok(first);
  const declared = new Set(first.tool.driver.rules.map((r) => r.id));
  for (const result of first.results) {
    assert.ok(declared.has(result.ruleId), `${result.ruleId} referenced but not declared`);
    assert.ok(["error", "warning", "note"].includes(result.level));
    assert.equal(result.locations.length, 1);
  }
  for (const rule of first.tool.driver.rules) {
    assert.match(rule.helpUri, /^https:\/\/deadhead\.cevdet\.ch\/rules\//);
  }
});

test("colour is dropped when stdout is not a terminal", () => {
  // spawnSync gives the child a pipe, so styleText must emit no escape codes.
  const ESC = String.fromCharCode(27);
  assert.ok(!deadhead("test/fixtures").stdout.includes(ESC));
});

// --- file collection --------------------------------------------------------

test("directories are walked, globs are expanded by the CLI, files are taken as given", async () => {
  const walked = await collectFiles(["test/fixtures"]);
  assert.equal(walked.length, rules.length * 2);

  const globbed = await collectFiles(["test/fixtures/*/*/invalid.html"]);
  assert.equal(globbed.length, rules.length);

  const explicit = await collectFiles(["test/fixtures/head/charset-position/valid.html"]);
  assert.deepEqual(explicit, ["test/fixtures/head/charset-position/valid.html"]);
});

test("node_modules is never walked", async () => {
  const files = await collectFiles(["."]);
  assert.deepEqual(files.filter((f) => f.includes("node_modules")), []);
});

// --- --fix, --config, --baseline --------------------------------------------

const sandbox = async (run: (dir: string) => Promise<void>): Promise<void> => {
  const dir = await mkdtemp(join(tmpdir(), "deadhead-cli-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const copyFixture = async (ruleId: string, into: string, as: string): Promise<string> => {
  const target = join(into, as);
  await writeFile(target, await readFile(`test/fixtures/${ruleId}/invalid.html`, "utf8"));
  return target;
};

test("--fix rewrites the file and leaves it clean", async () => {
  await sandbox(async (dir) => {
    const file = await copyFixture("attr/script-type-javascript", dir, "page.html");
    const run = deadhead("--fix", file);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /fixed 3 findings/);

    const after = await readFile(file, "utf8");
    assert.ok(!after.includes("text/javascript"), "the type attribute is gone");
    assert.match(after, /<script src="\/legacy\.js"><\/script>/, "the rest of the tag survives");
    // Running again finds nothing and rewrites nothing.
    assert.equal(deadhead(file).status, 0);
  });
});

test("--fix does not touch a file it has no fixes for", async () => {
  await sandbox(async (dir) => {
    // charset-position is `fix: { op: "none" }`, so the file must be left alone.
    const file = await copyFixture("head/charset-position", dir, "page.html");
    const before = await readFile(file, "utf8");
    const run = deadhead("--fix", "--fail-on=none", file);
    assert.equal(run.status, 0);
    assert.doesNotMatch(run.stdout, /fixed/);
    assert.equal(await readFile(file, "utf8"), before);
  });
});

test("a config file supplies defaults, and flags beat it", async () => {
  await sandbox(async (dir) => {
    await mkdir(join(dir, "site", "vendor"), { recursive: true });
    await copyFixture("attr/script-type-javascript", join(dir, "site"), "page.html");
    await copyFixture("meta/http-equiv-x-ua-compatible", join(dir, "site", "vendor"), "old.html");
    await writeFile(
      join(dir, "deadhead.config.ts"),
      `export default {
         include: ["site"],
         ignore: ["**/vendor/**"],
         rules: { "head/charset-position": "off" },
         failOn: "harmful",
       };`,
    );

    const run = spawnSync(process.execPath, [BIN, "--format=json"], { cwd: dir, encoding: "utf8" });
    const report = JSON.parse(run.stdout) as { results: { file: string }[] };
    assert.deepEqual(report.results.map((r) => r.file), [join("site", "page.html")], "vendor ignored");
    assert.equal(run.status, 0, "failOn: harmful is not met by unnecessary findings");

    // An explicit flag overrides the config's failOn.
    const stricter = spawnSync(process.execPath, [BIN, "--fail-on=unnecessary"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(stricter.status, 1);
  });
});

test("head-only mode is announced on stderr, and --no-head-only silences it", async () => {
  await sandbox(async (dir) => {
    const file = await copyFixture("meta/http-equiv-ie-pragmas", dir, "page.html");
    // Switch off every rule scoped beyond <head>: the body walk has nothing to do.
    const off = rules
      .filter((rule) => rule.meta.kind === "element" && rule.meta.scope !== "head")
      .map((rule) => `      "${rule.meta.ruleId}": "off",`);
    assert.ok(off.length > 0, "the fixture set has body-scoped rules to switch off");
    await writeFile(
      join(dir, "deadhead.config.ts"),
      `export default {\n  rules: {\n${off.join("\n")}\n  },\n};`,
    );

    const run = spawnSync(process.execPath, [BIN, file], { cwd: dir, encoding: "utf8" });
    assert.equal(run.status, 1, "head findings are still reported");
    assert.match(run.stderr, /head-only mode/);

    const full = spawnSync(process.execPath, [BIN, "--no-head-only", file], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(full.stderr, "", "the opt-out silences the note");
    assert.equal(full.stdout, run.stdout, "the walk changes nothing but speed");
  });
});

test("a baseline absorbs the backlog and still fails on anything new", async () => {
  await sandbox(async (dir) => {
    const file = await copyFixture("attr/script-type-javascript", dir, "page.html");
    const base = join(dir, "baseline.json");

    assert.equal(deadhead("--baseline", base, "--update-baseline", file).status, 0);
    assert.equal(deadhead("--baseline", base, file).status, 0, "the backlog is accounted for");

    // A finding from a different rule is new, and must break the build.
    const source = await readFile(file, "utf8");
    await writeFile(
      file,
      source.replace("<title>", '<meta http-equiv="X-UA-Compatible" content="IE=edge">\n    <title>'),
    );
    const run = deadhead("--baseline", base, file);
    assert.equal(run.status, 1);
    assert.match(run.stdout, /meta\/http-equiv-x-ua-compatible/);
    assert.doesNotMatch(run.stdout, /script\/type-javascript-mime/, "the backlog stays quiet");
  });
});

test("a baseline that is no longer needed says so instead of failing", async () => {
  await sandbox(async (dir) => {
    const file = await copyFixture("attr/script-type-javascript", dir, "page.html");
    const base = join(dir, "baseline.json");
    deadhead("--baseline", base, "--update-baseline", file);
    deadhead("--fix", "--fail-on=none", file);

    const run = deadhead("--baseline", base, file);
    assert.equal(run.status, 0);
    assert.match(run.stdout, /3 baseline entries are no longer needed/);
  });
});

test("config and baseline errors exit 2, like every other usage error", async () => {
  await sandbox(async (dir) => {
    const file = await copyFixture("attr/script-type-javascript", dir, "page.html");
    assert.equal(deadhead("--baseline", join(dir, "missing.json"), file).status, 2);
    assert.equal(deadhead("--config", join(dir, "missing.config.ts"), file).status, 2);
    assert.equal(deadhead("--update-baseline", file).status, 2, "--update-baseline needs a path");
  });
});

// --- rel keyword rules never delete a live link ------------------------------

const relPage = (link: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>\n${link}\n</head><body></body></html>`;

const relRules = rules.filter((rule) => rule.meta.selector?.includes("[rel~=") && rule.meta.fix.op !== "none");

test("no rel keyword rule removes the whole element", () => {
  // remove-element on `link[rel~=…]` deletes `rel="alternate index"` with its
  // live feed. remove-tokens (dead keywords) or remove-token / remove-attribute
  // (one named thing) are the safe ops.
  const wrong = relRules.filter((rule) => rule.meta.fix.op === "remove-element");
  assert.deepEqual(wrong.map((rule) => rule.meta.ruleId), []);
});

test("a dead keyword next to a live one loses the keyword, never the link", () => {
  for (const rule of relRules.filter((r) => r.meta.fix.op === "remove-tokens")) {
    const parsed = parseSelector(rule.meta.selector!);
    assert.ok(parsed.ok);
    // A keyword the rule's fixable() vetoes keeps the whole rel by design.
    const page = (value: string) => relPage(`<link rel="alternate ${value}" href="/feed.xml">`);
    const dead = tokenTests(parsed.ast, "rel").find(
      (t) => rule.fixable?.(parseHtml(page(t.value)).doc.querySelector("link")!) ?? true,
    );
    assert.ok(dead, `${rule.meta.ruleId} has a fixable rel keyword`);
    const html = page(dead.value);
    const out = applyFixes(html, run([rule], parseHtml(html), { fix: true }).flatMap((f) => (f.fix ? [f.fix] : []))).output;
    assert.match(out, /<link rel="alternate" href="\/feed\.xml">/, rule.meta.ruleId);
  }
});

test("--fix converges when two rules strip keywords from the same link", async () => {
  await sandbox(async (dir) => {
    const file = join(dir, "page.html");
    // sitemap (link/sitemap) and pavatar (link/vendor-keywords) share one rel.
    await writeFile(file, relPage('<link rel="alternate sitemap pavatar" href="/feed.xml">'));
    deadhead("--fix", "--fail-on=none", file);
    assert.match(await readFile(file, "utf8"), /<link rel="alternate" href="\/feed\.xml">/);
  });
});

test("an unreadable file is an I/O error: exit 2, never 1", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dh-"));
  const file = join(dir, "locked.html");
  await writeFile(file, "<!doctype html><title>x</title>");
  const { chmod } = await import("node:fs/promises");
  await chmod(file, 0o000);
  try {
    const run = deadhead(file);
    if (process.getuid?.() === 0) return; // root reads anything; nothing to assert
    assert.equal(run.status, 2, run.stderr);
    assert.match(run.stderr, /EACCES|permission/i);
  } finally {
    await chmod(file, 0o644);
    await rm(dir, { recursive: true, force: true });
  }
});

test("a config that ignores every HTML file says so", async () => {
  await sandbox(async (dir) => {
    await mkdir(join(dir, "site"));
    await copyFixture("meta/http-equiv-x-ua-compatible", join(dir, "site"), "page.html");
    await writeFile(
      join(dir, "deadhead.config.ts"),
      `export default { include: ["site"], ignore: ["site/**"] };`,
    );
    const run = spawnSync(process.execPath, [BIN], { cwd: dir, encoding: "utf8" });
    assert.equal(run.status, 2, run.stderr);
    assert.match(run.stderr, /every HTML file in: site is ignored by config/);
    assert.doesNotMatch(run.stderr, /no HTML files found/);
  });
});

test("a directory with no HTML files is a usage error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dh-"));
  await writeFile(join(dir, "notes.txt"), "hello");
  try {
    const run = deadhead(dir);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /no HTML files/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("--jobs gives the same report as a serial run", async () => {
  const serial = deadhead("--format=json", "--jobs=1", "test/fixtures");
  const parallel = deadhead("--format=json", "--jobs=4", "test/fixtures");
  assert.equal(parallel.status, serial.status);
  assert.deepEqual(JSON.parse(parallel.stdout), JSON.parse(serial.stdout));
});

test("- reads stdin and --stdin-filename names it", () => {
  const run = spawnSync(process.execPath, [BIN, "--format=json", "--stdin-filename=page.html", "-"], {
    cwd: ROOT, encoding: "utf8", input: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>x</title></head></html>',
  });
  const report = JSON.parse(run.stdout);
  assert.equal(report.results[0].file, "page.html");
  assert.ok(report.results[0].findings.some((f: { ruleId: string }) => f.ruleId === "meta/http-equiv-x-ua-compatible"));
});

test("--quiet drops findings below --fail-on; --output-file writes the report", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dh-"));
  try {
    const out = join(dir, "report.json");
    const run = deadhead("--format=json", "--quiet", "--fail-on=harmful", `--output-file=${out}`, "test/fixtures/meta/http-equiv-x-ua-compatible/invalid.html");
    assert.equal(run.stdout, "");
    const report = JSON.parse(await readFile(out, "utf8"));
    assert.deepEqual(report.results[0].findings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("--list-rules prints every rule and exits 0", () => {
  const run = deadhead("--list-rules", "--format=json");
  assert.equal(run.status, 0);
  assert.equal(JSON.parse(run.stdout).length, rules.length);
});

test("a suppression naming an unknown rule id warns on stderr", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dh-"));
  try {
    const file = join(dir, "a.html");
    await writeFile(file, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>x</title>\n<!-- deadhead-disable-next-line meta/nope -->\n</head></html>\n');
    const run = deadhead(file);
    assert.match(run.stderr, /unknown rule id `meta\/nope`/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a suppression naming a rule disabled by config does not warn", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dh-"));
  try {
    await writeFile(join(dir, "deadhead.config.ts"), `export default { rules: { "meta/http-equiv-x-ua-compatible": "off" } };\n`);
    await writeFile(join(dir, "a.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>x</title>\n<!-- deadhead-disable-next-line meta/http-equiv-x-ua-compatible -->\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n</head></html>\n');
    const run = spawnSync(process.execPath, [BIN, join(dir, "a.html")], { cwd: dir, encoding: "utf8" });
    assert.doesNotMatch(run.stderr, /unknown rule id/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
