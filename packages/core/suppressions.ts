/**
 * Suppression comments.
 *
 *     <!-- deadhead-disable-next-line meta/http-equiv-x-ua-compatible -->
 *     <!-- deadhead-disable meta/viewport-user-scalable -->
 *     <!-- deadhead-enable -->
 *
 * A bare `deadhead-disable` with no rule id suppresses everything.
 *
 * Source adapters supply actual comment nodes so strings inside scripts or
 * attributes cannot masquerade as directives. The DOM adapter supplies no
 * source comments, and a finding with no line cannot be suppressed by line.
 */

import type { SourceComment } from "./types.ts";

const DIRECTIVE = /^deadhead-(disable-next-line|disable|enable)\b([\s\S]*)$/;

/** Rule ids may be separated by whitespace, commas, or both. */
const parseIds = (rest: string): string[] =>
  rest
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter((id) => id !== "");

type Block = { from: number; to: number; all: boolean; ids: Set<string> };

export type Suppressions = {
  /** A finding with no line (the DOM adapter) can never be suppressed. */
  isSuppressed(ruleId: string, line: number | null): boolean;
  /** Every rule id named in a directive, with the directive's own line. */
  ids(): { line: number; id: string }[];
};

/** Nothing is suppressed. Used where there is no source text to read. */
export const NO_SUPPRESSIONS: Suppressions = { isSuppressed: () => false, ids: () => [] };

export function parseSuppressions(comments: readonly SourceComment[] | null): Suppressions {
  if (comments === null || !comments.some(comment => comment.text.includes("deadhead-"))) return NO_SUPPRESSIONS;
  const blocks: Block[] = [];
  const nextLine = new Map<number, { all: boolean; ids: Set<string> }>();

  // Open disables, kept separately so a bare `disable` and an id-specific one
  // can overlap without either swallowing the other.
  let openAll: number | null = null;
  const openIds = new Map<string, number>();
  // Every id named in a directive, for the unknown-id warning.
  const seen: { line: number; id: string }[] = [];

  const closeAll = (to: number): void => {
    if (openAll !== null) {
      blocks.push({ from: openAll, to, all: true, ids: new Set() });
      openAll = null;
    }
    for (const [id, from] of openIds) {
      blocks.push({ from, to, all: false, ids: new Set([id]) });
    }
    openIds.clear();
  };

  for (const comment of comments) {
    const { line } = comment;
    const directive = DIRECTIVE.exec(comment.text.trim());
    if (!directive) continue;

    const kind = directive[1] as "disable-next-line" | "disable" | "enable";
    const ids = parseIds(directive[2] ?? "");

    if (kind === "disable-next-line") {
      const target = line + 1;
      const existing = nextLine.get(target) ?? { all: false, ids: new Set<string>() };
      if (ids.length === 0) existing.all = true;
      for (const id of ids) {
        existing.ids.add(id);
        seen.push({ line, id });
      }
      nextLine.set(target, existing);
      continue;
    }

    if (kind === "disable") {
      if (ids.length === 0) openAll ??= line;
      for (const id of ids) {
        if (!openIds.has(id)) openIds.set(id, line);
        seen.push({ line, id });
      }
      continue;
    }

    // `enable` with no ids re-enables everything. With ids it closes only those
    // id-specific blocks; it deliberately does not carve a hole in a bare
    // `deadhead-disable`, which stays off until an unqualified `enable`.
    if (ids.length === 0) {
      closeAll(line);
    } else {
      for (const id of ids) {
        seen.push({ line, id });
        const from = openIds.get(id);
        if (from !== undefined) {
          blocks.push({ from, to: line, all: false, ids: new Set([id]) });
          openIds.delete(id);
        }
      }
    }
  }

  closeAll(Number.POSITIVE_INFINITY);

  return {
    isSuppressed(ruleId, line) {
      if (line === null) return false;
      const exact = nextLine.get(line);
      if (exact && (exact.all || exact.ids.has(ruleId))) return true;
      return blocks.some(
        (b) => line >= b.from && line <= b.to && (b.all || b.ids.has(ruleId)),
      );
    },
    ids() {
      return [...seen];
    },
  };
}
