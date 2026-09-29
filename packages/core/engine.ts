/**
 * Dispatch rules over a parsed document.
 *
 * The shape that matters: each comma alternative of a selector is bucketed by
 * its leading tag name once, at load time, and each node is tested against
 * its own bucket plus a small wildcard bucket. Iterating every rule for every
 * node is the obvious implementation and it is quadratic in the thing that
 * grows — the rule set.
 */

import { computeFix } from "./fix.ts";
import { type Compound, leadingTag, matches, parseSelector } from "./selector.ts";
import { NO_SUPPRESSIONS, type Suppressions } from "./suppressions.ts";
import { walk } from "./walker.ts";
import type {
  CheckFn,
  DoctypePort,
  ElementPort,
  Finding,
  FixableFn,
  MatchFn,
  Parsed,
  RuleContext,
} from "./types.ts";
import { type RuleMeta, ruleUrl } from "./vocabulary.ts";

/** A rule as the engine consumes it: metadata plus whatever code it needs. */
export type Rule = {
  meta: RuleMeta;
  /**
   * When `meta.kind === "element"` and `meta.match === "logic"`, the module
   * exports this, `fixable` or both.
   */
  match?: MatchFn;
  /** Required when `meta.kind === "document"`. */
  check?: CheckFn;
  /**
   * Per-finding autofix veto for an element rule. A `match: "logic"` rule may
   * carry this alone, with no `match`: the selector then decides.
   */
  fixable?: FixableFn;
};

type Compiled = Rule & { parsed: Compound[] | null; index: number; stamp: number };

/**
 * One rule as a dispatch bucket sees it: the rule plus the slice of its
 * selector that can match this bucket. `compounds` is `null` for a
 * selector-less rule, whose logic decides alone, and the whole parse for a
 * wildcard rule, whose alternatives fit no tag or attribute bucket.
 */
type Dispatched = { rule: Compiled; compounds: Compound[] | null };

/** Selector parses and dispatch buckets, built once and reused per file and per fix pass. */
export type CompiledRules = {
  byTag: Map<string, Dispatched[]>;
  byAttr: Map<string, Dispatched[]>;
  wildcard: Dispatched[];
  documents: Compiled[];
  visitBody: boolean;
};

export type RunOptions = {
  suppressions?: Suppressions;
  skipTemplates?: boolean;
  /**
   * Compute fixes. Only the `--fix` path (and the ESLint plugin, which fixes
   * itself) reads `finding.fix`; everything else skips the `attrRange`
   * lookups `computeFix` needs. Default off.
   */
  fix?: boolean;
};

const MAX_SNIPPET = 90;

/** The first positive attribute an alternative requires, lowercased, or null. */
const requiredAttr = (compound: Compound): string | null => {
  for (const simple of compound) if (simple.type === "attr") return simple.name.toLowerCase();
  return null;
};

const push = <K>(map: Map<K, Dispatched[]>, key: K, entry: Dispatched): void => {
  const list = map.get(key);
  if (list) list.push(entry);
  else map.set(key, [entry]);
};

/** Monotonic across runs, so a stamp from an earlier run never matches a later element. */
let visitCounter = 0;

const isDoctype = (target: ElementPort | DoctypePort): target is DoctypePort => "publicId" in target;

/** A doctype rebuilt from its parts, for an adapter with no source text to slice. */
function doctypeText(doctype: DoctypePort): string {
  const name = doctype.name === "" ? "" : ` ${doctype.name}`;
  if (doctype.publicId !== "") {
    const system = doctype.systemId === "" ? "" : ` "${doctype.systemId}"`;
    return `<!DOCTYPE${name} PUBLIC "${doctype.publicId}"${system}>`;
  }
  if (doctype.systemId !== "") return `<!DOCTYPE${name} SYSTEM "${doctype.systemId}">`;
  return `<!DOCTYPE${name}>`;
}

/**
 * The source text of the element or doctype, truncated. Falls back to
 * rebuilding it from the port when there is no source — the DOM adapter — so a
 * finding always names something the reader can recognise.
 */
function snippet(element: ElementPort | DoctypePort, source: string | null): string {
  const range = element.range();
  let text: string;
  if (source !== null && range !== null) {
    text = source.slice(range[0], range[1]);
  } else if (isDoctype(element)) {
    text = doctypeText(element);
  } else {
    const attrs = element
      .attrNames()
      .map((name) => ` ${name}="${element.attr(name) ?? ""}"`)
      .join("");
    text = `<${element.tag}${attrs}>`;
  }
  text = text.replace(/\s+/g, " ").trim();
  return text.length > MAX_SNIPPET ? `${text.slice(0, MAX_SNIPPET - 1)}…` : text;
}

function contextFor(rule: Rule, source: string | null, fix: boolean): RuleContext {
  const { meta } = rule;
  return {
    ruleId: meta.ruleId,
    report(target, extra) {
      const finding: Finding = {
        ruleId: meta.ruleId,
        severity: meta.severity,
        // `partial` detectability means the rule cannot be sure. It is reported
        // as "possible" and, in M4, never autofixed.
        possible: meta.detectability === "partial",
        message: meta.description,
        replacement: meta.replacement,
        url: ruleUrl(meta.ruleId),
        loc: target.loc(),
        range: target.range(),
        node: { tag: target.tag, snippet: snippet(target, source) },
        // Fixes are computed only when asked: without them there are no
        // `attrRange` lookups. No fix op edits a doctype without changing
        // the rendering mode, and `fixable` vetoes an element whose removal
        // would change what the page does.
        fix:
          fix && !isDoctype(target) && (rule.fixable === undefined || rule.fixable(target))
            ? computeFix(meta, target, source)
            : null,
      };
      // exactOptionalPropertyTypes: assign `detail` only when there is one.
      if (extra?.detail !== undefined) finding.detail = extra.detail;
      return finding;
    },
  };
}

/**
 * Parse each selector once and sort rules into dispatch buckets.
 *
 * Bucketing is per comma alternative, not per rule: an alternative can only
 * match elements with its leading tag, or with an attribute it requires, so
 * testing it anywhere else is pure waste. A rule lands in wildcard only when
 * one of its alternatives has neither a leading tag nor a required attribute
 * (or it has no selector at all) — then it must see every node.
 *
 * A selector that fails to parse here is a build failure that escaped
 * `validate-rules`, not user input, so it throws rather than degrading.
 */
export function compile(rules: Rule[]): CompiledRules {
  const byTag = new Map<string, Dispatched[]>();
  const byAttr = new Map<string, Dispatched[]>();
  const wildcard: Dispatched[] = [];
  const documents: Compiled[] = [];
  let visitBody = false;

  rules.forEach((rule, index) => {
    let parsed: Compound[] | null = null;
    if (rule.meta.selector !== null) {
      const result = parseSelector(rule.meta.selector);
      if (!result.ok) {
        throw new Error(
          `${rule.meta.ruleId}: unsupported selector ${JSON.stringify(rule.meta.selector)} — ${result.message}`,
        );
      }
      parsed = result.ast;
    }
    const compiled: Compiled = { ...rule, parsed, index, stamp: -1 };

    if (rule.meta.kind === "document") {
      documents.push(compiled);
      return;
    }
    if (rule.meta.scope !== "head") visitBody = true;

    if (parsed === null) {
      wildcard.push({ rule: compiled, compounds: null });
      return;
    }
    // Every alternative goes to the one bucket that sees every element it can
    // match: its leading tag, else an attribute it requires, else everything.
    const tagGroups = new Map<string, Compound[]>();
    const attrGroups = new Map<string, Compound[]>();
    const loose: Compound[] = [];
    for (const compound of parsed) {
      const tag = leadingTag([compound]);
      const attr = tag === null ? requiredAttr(compound) : null;
      const group = tag !== null ? tagGroups : attr !== null ? attrGroups : null;
      const key = tag ?? attr;
      if (group === null || key === null) loose.push(compound);
      else (group.get(key) ?? group.set(key, []).get(key)!).push(compound);
    }
    for (const [tag, compounds] of tagGroups) push(byTag, tag, { rule: compiled, compounds });
    for (const [attr, compounds] of attrGroups) push(byAttr, attr, { rule: compiled, compounds });
    if (loose.length > 0) wildcard.push({ rule: compiled, compounds: loose });
  });

  return { byTag, byAttr, wildcard, documents, visitBody };
}

/**
 * Sort key. Source offset is the real ordering; line/col is the fallback for
 * adapters that have no offsets, and breaks ties when nothing else can.
 */
const positionOf = (finding: Finding): [number, number, number] => [
  finding.range?.[0] ?? Number.MAX_SAFE_INTEGER,
  finding.loc?.line ?? 0,
  finding.loc?.col ?? 0,
];

export function runCompiled(compiled: CompiledRules, parsed: Parsed, options: RunOptions = {}): Finding[] {
  const { byTag, byAttr, wildcard, documents, visitBody } = compiled;
  const suppressions = options.suppressions ?? NO_SUPPRESSIONS;
  const findings: Finding[] = [];
  const fix = options.fix === true;

  // Document rules first: they query the whole tree rather than riding the walk.
  for (const rule of documents) {
    if (!rule.check) {
      throw new Error(`${rule.meta.ruleId}: kind "document" requires a check() logic module`);
    }
    findings.push(...rule.check(parsed.doc, contextFor(rule, parsed.source, fix)));
  }

  const contexts = new Map<string, RuleContext>();
  const contextOf = (rule: Rule): RuleContext => {
    let ctx = contexts.get(rule.meta.ruleId);
    if (!ctx) {
      ctx = contextFor(rule, parsed.source, fix);
      contexts.set(rule.meta.ruleId, ctx);
    }
    return ctx;
  };

  const walkOptions: { visitBody: boolean; skipTemplates?: boolean } = { visitBody };
  if (options.skipTemplates !== undefined) walkOptions.skipTemplates = options.skipTemplates;

  walk(
    parsed.roots,
    (element, region) => {
      const visit = ++visitCounter;
      let local: Finding[] | null = null;
      let localIndex: number[] | null = null;

      const consider = (entry: Dispatched): void => {
        const rule = entry.rule;
        const scope = rule.meta.scope;
        // Unplaced markup lands in the head or the body of a page this run
        // cannot see, so rules of either scope check it.
        if (scope === "head" && region !== "head" && region !== "unplaced") return;
        if (scope === "body" && region !== "body" && region !== "unplaced") return;
        if (rule.stamp === visit) return;
        if (entry.compounds !== null && !matches(element, entry.compounds)) return;
        rule.stamp = visit;
        const ctx = contextOf(rule);
        if (rule.meta.match === "logic") {
          if (rule.match) {
            if (!rule.match(element, ctx)) return;
          } else if (!rule.fixable) {
            // A module exporting only `fixable` leaves matching to the selector.
            throw new Error(`${rule.meta.ruleId}: match "logic" requires a match() or fixable() logic module`);
          }
        }
        (local ??= []).push(ctx.report(element));
        (localIndex ??= []).push(rule.index);
      };

      // Two loops rather than a concatenation: this runs once per node, and
      // building a throwaway array per node is the allocation that shows up.
      const bucket = byTag.get(element.tag);
      if (bucket !== undefined) for (const entry of bucket) consider(entry);
      if (byAttr.size > 0) {
        for (const name of element.attrNames()) {
          const attrBucket = byAttr.get(name);
          if (attrBucket !== undefined) for (const entry of attrBucket) consider(entry);
        }
      }
      for (const entry of wildcard) consider(entry);

      if (local === null || localIndex === null) return;
      const done = local as Finding[];
      const doneIdx = localIndex as number[];
      if (done.length === 1) {
        findings.push(done[0] as Finding);
        return;
      }
      // One element, several rules: report in rule order, whichever bucket found them.
      const pairs: [number, number][] = doneIdx.map((idx: number, i: number) => [idx, i]);
      pairs.sort((a: [number, number], b: [number, number]) => a[0] - b[0]);
      for (const [, i] of pairs) findings.push(done[i] as Finding);
    },
    walkOptions,
  );

  return dedupe(findings, suppressions);
}

/**
 * Convenience wrapper that compiles on every call. Prefer `compile()` once
 * plus `runCompiled()` per file and per fix pass on hot paths (CLI `--fix`
 * over many files); this stays for single-shot callers (tests, bookmarklet).
 */
export function run(rules: Rule[], parsed: Parsed, options: RunOptions = {}): Finding[] {
  return runCompiled(compile(rules), parsed, options);
}

function dedupe(findings: Finding[], suppressions: Suppressions): Finding[] {
  const seen = new Set<string>();
  const kept: Finding[] = [];

  for (const finding of findings) {
    if (suppressions.isSuppressed(finding.ruleId, finding.loc?.line ?? null)) continue;
    const key =
      finding.range !== null
        ? `${finding.ruleId}:${finding.range[0]}`
        : finding.loc !== null
          ? `${finding.ruleId}:${finding.loc.line}:${finding.loc.col}`
          : null;
    if (key !== null) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    kept.push(finding);
  }

  // No ruleId tiebreak: findings are collected in document order by the walk,
  // and Array#sort is stable, so ties keep that order. It matters in the DOM
  // adapter, where nothing has an offset and *every* finding ties -- sorting
  // by ruleId there would list a page's findings alphabetically instead of
  // top to bottom.
  return kept.sort((a, b) => {
    const [ao, al, ac] = positionOf(a);
    const [bo, bl, bc] = positionOf(b);
    return ao - bo || al - bl || ac - bc;
  });
}
