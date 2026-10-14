#!/usr/bin/env node
/**
 * `deadhead` — lint HTML for deprecated, unnecessary and harmful markup.
 *
 * Exit codes are the contract CI depends on:
 *   0  no finding at or above the `--fail-on` threshold
 *   1  threshold met
 *   2  usage, config, I/O error, or an internal error
 *
 * The distinction matters: a broken invocation and a clean run must never look
 * the same to a build script, and findings must never look like a crash.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, matchesGlob, resolve } from "node:path";
import { parseArgs, styleText } from "node:util";
import { enableCompileCache } from "node:module";

// Caches compiled module code between runs (Node ≥22.1). A no-op when the
// cache directory is not writable; never affects results.
enableCompileCache?.();

import { SEVERITY, SEVERITY_RANK, SITE_URL, ruleUrl } from "../../core/vocabulary.ts";
import { RulesNotBuiltError, loadRules } from "../../rules/load.ts";
import {
  BaselineError,
  applyBaseline,
  readBaseline,
  summarise,
  writeBaseline,
} from "../baseline.ts";
import { ConfigError, applySettings, fromConfigDir, loadConfig } from "../config.ts";
import { UsageError, collectFiles, compileForRun, defaultJobs, lintFiles, lintFilesParallel, lintSource } from "../lint.ts";
import { type FileResult, type Reporter, tally, total, totalFixed } from "../reporters/index.ts";
import { json } from "../reporters/json.ts";
import { sarif } from "../reporters/sarif.ts";
import { stylish } from "../reporters/stylish.ts";

const REPORTERS: Record<string, Reporter> = { stylish, json };

const readVersion = async (): Promise<string> => {
  const pkg: { version?: string } = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  return pkg.version ?? "0.0.0";
};
const FAIL_ON = [...SEVERITY, "none"] as const;
type Threshold = (typeof FAIL_ON)[number];

const isThreshold = (value: unknown): value is Threshold =>
  value === "none" || (typeof value === "string" && SEVERITY.some((known) => known === value));

const USAGE = `
${styleText("bold", "deadhead")} — lint HTML for deprecated, unnecessary and harmful markup

  ${styleText("bold", "Usage:")} deadhead [options] [file|dir|glob]...

  -f, --format <name>     stylish (default), json, sarif
      --fail-on <level>   exit 1 when a finding is this severe or worse:
                          harmful, deprecated, unnecessary (default), none
      --fix               rewrite files in place, then report what is left
      --skip-templates    do not lint the contents of <template>
      --no-head-only      walk <body> even with only head-scoped rules
  -c, --config <path>     defaults to ./deadhead.config.ts when present
      --baseline <path>   ignore findings already accounted for (files only)
      --update-baseline   rewrite the baseline from files, then exit 0
  -j, --jobs <n>          maximum workers, bounded by CPUs and files (large trees)
  -o, --output-file <path> write the report to <path> instead of stdout
  -q, --quiet             report only findings at or above --fail-on
      --list-rules        print every rule, then exit 0
      --stdin-filename <name> name stdin in the report; requires -
  -h, --help              show this
  -v, --version           show the version

  ${styleText("bold", "Examples:")}
    deadhead index.html             check one HTML file
    deadhead dist                   check your built site
    deadhead "src/**/*.html"         expand a quoted glob
    deadhead --fix dist             remove fixable markup from files
    cat page.html | deadhead - --stdin-filename page.html

  Exit codes: 0 below --fail-on; 1 findings meet it; 2 invocation or runtime error.
  Try HTML in your browser: ${SITE_URL}/try
  ${styleText("dim", `Every finding links to ${SITE_URL}/rules/<ruleId>.`)}
`.trimStart();

const fail: (message: string) => never = (message) => {
  process.stderr.write(`${styleText("red", "error")} ${message}\n`);
  process.exit(2);
};

const writeStdout = (text: string): Promise<void> => new Promise((resolve, reject) => {
  const error = (cause: Error): void => { reject(cause); };
  process.stdout.once("error", error);
  process.stdout.write(text, cause => {
    if (cause) reject(cause);
    else { process.stdout.removeListener("error", error); resolve(); }
  });
});

let values;
let positionals: string[];
try {
  ({ values, positionals } = parseArgs({
    options: {
      format: { type: "string", short: "f", default: "stylish" },
      "fail-on": { type: "string" },
      fix: { type: "boolean", default: false },
      "skip-templates": { type: "boolean" },
      "no-head-only": { type: "boolean", default: false },
      config: { type: "string", short: "c" },
      baseline: { type: "string" },
      "update-baseline": { type: "boolean", default: false },
      jobs: { type: "string", short: "j" },
      "output-file": { type: "string", short: "o" },
      quiet: { type: "boolean", short: "q", default: false },
      "list-rules": { type: "boolean", default: false },
      "stdin-filename": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
    allowPositionals: true,
  }));
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

if (values.help) {
  await writeStdout(USAGE);
  process.exit(0);
}

if (values.version) {
  await writeStdout(`${await readVersion()}\n`);
  process.exit(0);
}

const isSarif = values.format === "sarif";
const reporter = Object.hasOwn(REPORTERS, values.format) ? REPORTERS[values.format] : undefined;
if (reporter === undefined && !isSarif) {
  fail(`unknown --format ${JSON.stringify(values.format)} (expected ${[...Object.keys(REPORTERS), "sarif"].join(", ")})`);
}

/** Config supplies defaults; an explicit flag always wins. */
try {
  const allRules = await loadRules();
  const loaded = await loadConfig(
    process.cwd(),
    values.config,
    new Set(allRules.map((rule) => rule.meta.ruleId)),
  );
  const config = loaded?.config ?? {};

  const threshold = values["fail-on"] ?? config.failOn ?? "unnecessary";
  if (!isThreshold(threshold)) {
    fail(`unknown --fail-on ${JSON.stringify(threshold)} (expected ${FAIL_ON.join(", ")})`);
  }

  // `off` drops the rule entirely rather than filtering its findings later, so
  // it costs nothing to have it disabled.
  const settings = config.rules ?? {};
  const rules = applySettings(allRules, settings);

  if (values["list-rules"]) {
    if (values.format === "json") {
      await writeStdout(
        `${JSON.stringify(rules.map((rule) => ({ ruleId: rule.meta.ruleId, severity: rule.meta.severity, description: rule.meta.description, url: ruleUrl(rule.meta.ruleId) })), null, 2)}\n`,
      );
    } else {
      await writeStdout(rules.map(rule => `${rule.meta.ruleId}  ${rule.meta.severity}  ${rule.meta.description}\n`).join(""));
    }
    process.exit(0);
  }

  const stdin = positionals.length === 1 && positionals[0] === "-";
  if (positionals.includes("-") && !stdin) {
    fail("stdin (-) must be the only input; do not mix it with files or globs");
  }
  if (values["stdin-filename"] !== undefined && !stdin) {
    fail("--stdin-filename requires stdin (-)");
  }
  let jobs = defaultJobs();
  if (values.jobs !== undefined) {
    const parsed = Number(values.jobs);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      fail(`--jobs must be a positive integer (got ${JSON.stringify(values.jobs)})`);
    }
    jobs = parsed;
  }
  const baselinePath = values.baseline ??
    (loaded && config.baseline !== undefined ? fromConfigDir(loaded, config.baseline) : undefined);
  if (stdin && (values["update-baseline"] || baselinePath !== undefined)) {
    fail("baseline options require files; they cannot be used with stdin");
  }
  if (values["update-baseline"] && baselinePath === undefined) {
    fail("--update-baseline needs --baseline <path>, or `baseline` in the config");
  }
  // Read and validate before --fix can change an input file.
  const baseline = baselinePath !== undefined && !values["update-baseline"]
    ? await readBaseline(baselinePath) : null;

  const skipTemplates = values["skip-templates"] ?? config.skipTemplates ?? false;
  const lintOptions = {
    skipTemplates,
    fix: values.fix,
    headOnly: !values["no-head-only"],
  };

  let results: FileResult[];
  let resolved = 0;
  if (stdin) {
    if (values.fix === true) fail("--fix needs files; it cannot rewrite stdin");
    process.stdin.setEncoding("utf8");
    let source = "";
    for await (const chunk of process.stdin) source += chunk;
    const name = values["stdin-filename"] ?? "<stdin>";
    const linted = lintSource(source, name, compileForRun(rules, { ...lintOptions, fix: false }), { ...lintOptions, fix: false });
    results = [{ file: linted.file, findings: linted.findings, fixed: linted.fixed, warnings: linted.warnings }];
  } else {
    const targets = positionals.length > 0 ? positionals : (config.include ?? []);
    if (targets.length === 0) {
      process.stderr.write(USAGE);
      process.exit(2);
    }

    const ignore = config.ignore ?? [];
    const found = await collectFiles(targets);
    const files = found.filter((file) => !ignore.some((pattern) => matchesGlob(file, pattern)));

    if (files.length === 0) {
      fail(
        found.length === 0
          ? `no HTML files found in: ${targets.join(", ")}`
          : `every HTML file in: ${targets.join(", ")} is ignored by config`,
      );
    }

    const run =
      files.length >= 64 && jobs > 1
        ? await lintFilesParallel(files, settings, lintOptions, jobs)
        : await lintFiles(files, rules, lintOptions);
    results = run.results;

    // Head-only mode is silent by design of the engine — the walk just never
    // descends — so say so on stderr, where machine-readable stdout stays
    // clean. It applies only when the active rule set allows it, which with
    // the shipped rules means the user switched the body-scoped ones off.
    if (values["no-head-only"] !== true && !run.visitBody) {
      process.stderr.write(
        `${styleText("dim", "head-only mode: no active rule is scoped beyond <head>, so the <body> walk is skipped (pass --no-head-only to walk it anyway)")}\n`,
      );
    }

    if (values["update-baseline"]) {
      if (baselinePath === undefined) {
        fail("--update-baseline needs --baseline <path>, or `baseline` in the config");
      }
      const baseline = summarise(results, dirname(resolve(baselinePath)));
      await writeBaseline(baselinePath, baseline);
      const count = total(results);
      await writeStdout(
        `${styleText("green", "✓")} baseline written to ${baselinePath} ` +
          `(${count} finding${count === 1 ? "" : "s"} accepted)\n`,
      );
      process.exit(0);
    }

    if (baseline !== null) {
      const applied = applyBaseline(results, baseline, dirname(resolve(baselinePath!)));
      results = applied.results;
      resolved = applied.resolved;
    }
  }

  const knownIds = new Set(allRules.map((rule) => rule.meta.ruleId));
  for (const result of results) {
    for (const warning of result.warnings) {
      // Disabled by config is not unknown: the id names a real rule that this
      // run turned off, and disable-plus-suppress is a normal rollout pattern.
      if (knownIds.has(warning.id)) continue;
      process.stderr.write(`warn ${result.file}:${warning.line}: unknown rule id \`${warning.id}\` in a deadhead comment\n`);
    }
  }

  let reported = results;
  if (values.quiet === true && threshold !== "none") {
    const floor = SEVERITY_RANK[threshold];
    reported = results.map((result) => ({
      ...result,
      findings: result.findings.filter((finding) => SEVERITY_RANK[finding.severity] >= floor),
    }));
  }

  const text = isSarif ? sarif(reported, await readVersion()) : (reporter as Reporter)(reported);
  if (values["output-file"] !== undefined) {
    await writeFile(values["output-file"], text, "utf8");
  } else {
    await writeStdout(text);
  }

  const fixed = totalFixed(results);
  const notice = async (text: string): Promise<void> => {
    if (values.format === "stylish") await writeStdout(text);
    else process.stderr.write(text);
  };
  if (fixed > 0) {
    await notice(
      `${styleText("green", "✓")} fixed ${fixed} finding${fixed === 1 ? "" : "s"}\n`,
    );
  }
  if (resolved > 0) {
    await notice(
      `${styleText("dim", `${resolved} baseline entr${resolved === 1 ? "y is" : "ies are"} ` +
        "no longer needed; re-run with --update-baseline to prune")}\n`,
    );
  }

  if (threshold === "none" || total(reported) === 0) process.exitCode = 0;
  else {
    // A threshold fails on itself and on everything worse: --fail-on=deprecated
    // also fails on harmful.
    const counts = tally(reported);
    const floor = SEVERITY_RANK[threshold];
    const breached = SEVERITY.some(
      (severity) => counts[severity] > 0 && SEVERITY_RANK[severity] >= floor,
    );
    process.exitCode = breached ? 1 : 0;
  }

  // Writes have completed. Leave the exit code for Node instead of dropping
  // buffered diagnostics with process.exit().
} catch (err) {
  if (err instanceof UsageError || err instanceof RulesNotBuiltError) fail(err.message);
  if (err instanceof ConfigError || err instanceof BaselineError) fail(err.message);
  // Anything else is an I/O failure or a bug. Exit 1 means "findings"; a crash
  // must never look like one, so it is 2 with the cause on stderr.
  const code = (err as NodeJS.ErrnoException).code;
  fail(
    code !== undefined
      ? `${code}: ${(err as Error).message}`
      : `internal error: ${(err as Error).stack ?? String(err)}`,
  );
}
