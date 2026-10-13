/**
 * `deadhead.config.ts` — optional project configuration.
 *
 * A real `.ts` file, imported directly: Node strips the types, so there is no
 * loader, no bundler and no separate schema language to learn. The trade is
 * that a config can run arbitrary code, which is true of every JS-ecosystem
 * config file and is why it is read from the project directory rather than
 * discovered by walking upwards into places the user did not choose.
 *
 * Everything here is optional, and every CLI flag beats it. A config file that
 * silently overrode an explicit `--fail-on` would be a trap.
 */

import { stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { Rule } from "../core/engine.ts";
import { SEVERITY, type Severity } from "../core/vocabulary.ts";

export type RuleSetting = "off" | Severity;

export type DeadheadConfig = {
  /** Paths or globs to lint when none are given on the command line. */
  include?: string[];
  /** Paths or globs to skip, applied after `include` and after directory walks. */
  ignore?: string[];
  /** Turn a rule off, or report it at a different severity than it ships with. */
  rules?: Record<string, RuleSetting>;
  /** Default `--fail-on` threshold. */
  failOn?: Severity | "none";
  /** Default `--skip-templates`. */
  skipTemplates?: boolean;
  /** Path to a baseline file, relative to the config. */
  baseline?: string;
};

/** Identity function that exists purely to give config authors type checking. */
export const defineConfig = (config: DeadheadConfig): DeadheadConfig => config;

export class ConfigError extends Error {}

const CONFIG_NAME = "deadhead.config.ts";
const KEYS = new Set(["include", "ignore", "rules", "failOn", "skipTemplates", "baseline"]);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function assertIsRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigError(message);
  }
}

const isSeverity = (value: unknown): value is Severity =>
  typeof value === "string" && SEVERITY.some((known) => known === value);

/**
 * Validate by hand, like the frontmatter schema, and for the same reason: the
 * error a contributor sees is the point. "unknown rule `meta/viewport` in
 * deadhead.config.ts" beats "invalid enum value at rules.meta/viewport".
 */
export function validateConfig(raw: unknown, knownRules: Set<string>, path: string): DeadheadConfig {
  assertIsRecord(raw, `${path}: default export must be an object`);
  const input = raw;
  const config: DeadheadConfig = {};

  for (const key of Object.keys(input)) {
    if (!KEYS.has(key)) {
      throw new ConfigError(`${path}: unknown option \`${key}\` (known: ${[...KEYS].join(", ")})`);
    }
  }

  for (const key of ["include", "ignore"] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (!isStringArray(value)) throw new ConfigError(`${path}: \`${key}\` must be a list of strings`);
    config[key] = value;
  }

  if (input["rules"] !== undefined) {
    const rules = input["rules"];
    assertIsRecord(rules, `${path}: \`rules\` must be an object`);
    const out: Record<string, RuleSetting> = {};
    for (const [ruleId, setting] of Object.entries(rules)) {
      // A typo here would otherwise disable nothing and say nothing.
      if (!knownRules.has(ruleId)) {
        throw new ConfigError(`${path}: unknown rule \`${ruleId}\``);
      }
      if (setting !== "off" && !isSeverity(setting)) {
        throw new ConfigError(
          `${path}: rules["${ruleId}"] must be "off" or one of ${SEVERITY.join(", ")}`,
        );
      }
      out[ruleId] = setting;
    }
    config.rules = out;
  }

  if (input["failOn"] !== undefined) {
    const failOn = input["failOn"];
    if (failOn !== "none" && !isSeverity(failOn)) {
      throw new ConfigError(`${path}: \`failOn\` must be "none" or one of ${SEVERITY.join(", ")}`);
    }
    config.failOn = failOn;
  }

  if (input["skipTemplates"] !== undefined) {
    if (typeof input["skipTemplates"] !== "boolean") {
      throw new ConfigError(`${path}: \`skipTemplates\` must be a boolean`);
    }
    config.skipTemplates = input["skipTemplates"];
  }

  if (input["baseline"] !== undefined) {
    if (typeof input["baseline"] !== "string" || input["baseline"] === "") {
      throw new ConfigError(`${path}: \`baseline\` must be a path`);
    }
    config.baseline = input["baseline"];
  }

  return config;
}

export type LoadedConfig = { config: DeadheadConfig; path: string; dir: string };

/**
 * Load `deadhead.config.ts` from `cwd`, or from an explicit path.
 *
 * An explicit `--config` that does not exist is an error; an absent default is
 * not. Running with no config at all is the common case and must stay silent.
 */
export async function loadConfig(
  cwd: string,
  explicit: string | undefined,
  knownRules: Set<string>,
): Promise<LoadedConfig | null> {
  const path = explicit === undefined ? resolve(cwd, CONFIG_NAME) : resolve(cwd, explicit);

  const found = await stat(path).catch(() => null);
  if (found === null || !found.isFile()) {
    if (explicit !== undefined) throw new ConfigError(`no such config file: ${explicit}`);
    return null;
  }

  const module: { default?: unknown } = await import(pathToFileURL(path).href);
  if (module.default === undefined) {
    throw new ConfigError(`${path}: must \`export default\` a config object`);
  }

  return { config: validateConfig(module.default, knownRules, path), path, dir: resolve(path, "..") };
}

/** Resolve a config-relative path against the config's own directory. */
export const fromConfigDir = (loaded: LoadedConfig, path: string): string =>
  isAbsolute(path) ? path : resolve(loaded.dir, path);

/**
 * The bin's rule filter as a function, so the serial path and the lint
 * workers share it: `off` drops the rule entirely rather than filtering its
 * findings later, so it costs nothing to have it disabled.
 */
export function applySettings(rules: Rule[], settings: Record<string, RuleSetting>): Rule[] {
  return rules
    .filter((rule) => settings[rule.meta.ruleId] !== "off")
    .map((rule) => {
      const override = settings[rule.meta.ruleId];
      return override === undefined || override === "off"
        ? rule
        : { ...rule, meta: { ...rule.meta, severity: override } };
    });
}
