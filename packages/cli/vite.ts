/** Dev-time reports using the CLI parser and rule set. Vite is a type-only peer. */
import { createHash } from "node:crypto";
import { posix } from "node:path";
import type { Plugin } from "vite";

import type { CompiledRules } from "../core/index.ts";
import { loadRules } from "../rules/load.ts";
import { applySettings, ConfigError, loadConfig, validateConfig, type DeadheadConfig } from "./config.ts";
import { stylish } from "./reporters/stylish.ts";
import { compileForRun, lintSource } from "./source.ts";
import { observeHtml } from "./vite-response.ts";

export type DeadheadViteOptions = Pick<DeadheadConfig, "include" | "ignore" | "rules" | "skipTemplates"> & {
  /** Print a report in DevTools as well as the terminal. Defaults to true. */
  console?: boolean;
};

const MAX_PAGES = 512;
const MAX_CACHE_BYTES = 4 * 1024 * 1024;
type CachedReport = {
  input: string;
  fingerprint: string;
  script: string;
  terminal: string;
  warnings: string[];
  hasFindings: boolean;
  bytes: number;
};

/** Inline script data must not be able to close its script or create HTML. */
const jsonForScript = (value: unknown): string => JSON.stringify(value).replace(/</g, "\\u003c");

function consoleScript(result: ReturnType<typeof lintSource>, nonce: string | undefined): string {
  const findings = result.findings.map(({ ruleId, severity, possible, loc, message, replacement, url, detail }) =>
    ({ ruleId, severity, possible, loc, message, replacement, url, detail }));
  const data = jsonForScript({ file: result.file, findings, warnings: result.warnings });
  // Nonces come from Vite config, but still escape attribute delimiters.
  const attr = nonce === undefined ? "" : ` nonce="${nonce.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`;
  return `\n<script type="module" data-deadhead-report${attr}>
const report = ${data};
console.groupCollapsed("%s", "[deadhead] " + report.file + ": " + report.findings.length + " findings");
const groups = new Map();
for (const finding of report.findings) {
  if (!groups.has(finding.ruleId)) groups.set(finding.ruleId, []);
  groups.get(finding.ruleId).push(finding);
}
for (const [ruleId, findings] of groups) {
  console.groupCollapsed("%s", ruleId + " (" + findings.length + ")");
  for (const f of findings) {
    const loc = f.loc ? f.loc.line + ":" + f.loc.col : "-";
    console.warn("%s", loc + " " + f.severity + (f.possible ? " (possible)" : "") + " " + f.message);
    if (f.detail) console.info("%s", f.detail);
    console.info("%s", f.replacement + "\\n" + f.url);
  }
  console.groupEnd();
}
for (const warning of report.warnings) console.warn("%s", "Unknown suppression " + warning.id + " at line " + warning.line);
console.groupEnd();
</script>`;
}

/** Lint completed UTF-8 HTML responses in vite dev, including SSR middleware. */
export default function deadhead(options: DeadheadViteOptions = {}): Plugin {
  let config: DeadheadConfig = {};
  let compiled: CompiledRules | undefined;
  let known = new Set<string>();
  const { console: browserConsole = true, ...settings } = options;
  return {
    name: "deadhead",
    apply: "serve",
    enforce: "pre",
    async configResolved(resolved) {
      const rules = await loadRules();
      known = new Set(rules.map((rule) => rule.meta.ruleId));
      if (typeof browserConsole !== "boolean") throw new ConfigError("deadhead/vite: `console` must be a boolean");
      const overrides = validateConfig(settings, known, "deadhead/vite");
      const loaded = await loadConfig(resolved.root, undefined, known);
      config = { ...loaded?.config, ...overrides, rules: { ...loaded?.config.rules, ...overrides.rules } };
      compiled = compileForRun(applySettings(rules, config.rules ?? {}), config);
    },
    configureServer(server) {
      const activeRules = compiled;
      if (activeRules === undefined) throw new Error("deadhead/vite: configResolved must run before configureServer");
      const seen = new Map<string, string>();
      const reports = new Map<string, CachedReport>();
      let retainedBytes = 0;
      const emit = (path: string, report: CachedReport): void => {
        if (seen.get(path) === report.fingerprint) return;
        seen.delete(path);
        seen.set(path, report.fingerprint);
        if (seen.size > MAX_PAGES) seen.delete(seen.keys().next().value!);
        if (report.hasFindings) server.config.logger.warn(report.terminal);
        else server.config.logger.info(report.terminal);
        for (const warning of report.warnings) server.config.logger.warn(warning);
      };

      server.middlewares.use((req, res, next) => {
        let path: string;
        try { path = decodeURIComponent(new URL(req.url ?? "/", "http://deadhead.local").pathname).replace(/^\/+/, ""); }
        catch { next(); return; }
        // URL paths, without query strings or leading '/', not files on disk.
        if (config.include !== undefined && !config.include.some((glob) => posix.matchesGlob(path, glob))) { next(); return; }
        if (config.ignore?.some((glob) => posix.matchesGlob(path, glob))) { next(); return; }
        observeHtml(req, res, browserConsole, (html) => {
          try {
            const input = createHash("sha256").update(html).digest("hex");
            const cached = reports.get(path);
            if (cached?.input === input) {
              reports.delete(path);
              reports.set(path, cached);
              emit(path, cached);
              return cached.script;
            }
            const result = lintSource(html, `/${path} (served HTML)`, activeRules, config);
            // A real rule disabled in config is still a valid suppression id,
            // just as on the CLI path. lintSource only knows the active rules.
            result.warnings = result.warnings.filter(({ id }) => !known.has(id));
            const fingerprint = createHash("sha256").update(JSON.stringify([result.findings, result.warnings])).digest("hex");
            const script = browserConsole ? consoleScript(result, server.config.html?.cspNonce) : "";
            const terminal = `[deadhead] ${result.findings.length === 0 ? result.file + "\n" : ""}${stylish([result]).trimEnd()}`;
            const warnings = result.warnings.map(({ line, id }) => `[deadhead] /${path}:${line}: unknown suppression \`${id}\``);
            // Retain prepared text, never the response body or parsed tree.
            const bytes = 2 * (script.length + terminal.length + warnings.reduce((sum, warning) => sum + warning.length, 0) + path.length) + 256;
            const report: CachedReport = { input, fingerprint, script, terminal, warnings, hasFindings: result.findings.length > 0, bytes };
            emit(path, report);
            if (cached !== undefined) { reports.delete(path); retainedBytes -= cached.bytes; }
            if (bytes <= MAX_CACHE_BYTES) {
              reports.set(path, report);
              retainedBytes += bytes;
              while (reports.size > MAX_PAGES || retainedBytes > MAX_CACHE_BYTES) {
                const oldest = reports.keys().next().value!;
                retainedBytes -= reports.get(oldest)!.bytes;
                reports.delete(oldest);
              }
            }
            return script;
          } catch (error) {
            // A lint failure must not swallow the application's final chunk.
            server.config.logger.error(`[deadhead] /${path}: ${error instanceof Error ? error.message : String(error)}`);
            return "";
          }
        });
        next();
      });
    },
  };
}
