/**
 * One pass over the element tree, tagging each node with the region it is in.
 *
 * `scope` is the main performance lever in the project: a document whose rules
 * are all `scope: "head"` never descends into `<body>` at all, which on a real
 * page is the difference between a dozen nodes and a few thousand.
 */

import type { ElementPort } from "./types.ts";

/**
 * Where a node sits. `"head"` and `"body"` are the two halves of a page, and
 * `null` is `<html>` itself. `"unplaced"` is markup with no `<head>` or
 * `<body>` around it: a fragment's top-level elements and what they hold,
 * which the page they land in places. Rules of either scope check it.
 */
export type Region = "head" | "body" | "unplaced" | null;

/**
 * Markup inside these is content, not markup to lint. A `<code>` sample of a
 * bad `<meta>` tag is the whole point of a rule's documentation, and flagging
 * it would make the tool unusable on its own site. The container itself is
 * still visited; only its descendants are skipped.
 *
 * The second group is parsed as text by the HTML Standard (raw text or RCDATA,
 * and `noscript` with scripting enabled), so a spec parser never builds
 * elements inside them. parse5 follows the spec; linkedom and
 * `@html-eslint/parser` do not, and without this they report findings inside
 * that parse5 cannot see.
 *
 * `plaintext` has no end tag: a spec parser turns everything after it into
 * text. linkedom and `@html-eslint/parser` leave it open instead, so what
 * follows becomes its descendants, and skipping them makes all three agree.
 * Only an explicit `</plaintext>`, which a browser ignores, still splits them.
 */
const OPAQUE = new Set([
  "pre",
  "code",
  "textarea",
  "samp",
  "kbd",
  "iframe",
  "noembed",
  "noframes",
  "noscript",
  "plaintext",
  "title",
  "xmp",
]);

export type WalkOptions = {
  /** Skip descending into `<body>` when no rule is scoped to reach it. */
  visitBody?: boolean;
  /** `<template>` content is inert markup; opt out of linting it. */
  skipTemplates?: boolean;
};

export function walk(
  roots: readonly ElementPort[],
  visit: (element: ElementPort, region: Region) => void,
  options: WalkOptions = {},
): void {
  const visitBody = options.visitBody ?? true;
  const skipTemplates = options.skipTemplates ?? false;

  // An explicit stack: markup nested thousands deep is legal HTML, and a
  // recursive walk dies on it. Roots and children are pushed in reverse so
  // they pop in document order.
  const stack: [ElementPort, Region][] = [];
  for (let i = roots.length - 1; i >= 0; i--) stack.push([roots[i]!, "unplaced"]);
  while (stack.length > 0) {
    const [element, inherited] = stack.pop()!;
    const tag = element.tag;
    const region: Region = tag === "head" ? "head" : tag === "body" ? "body" : tag === "html" ? null : inherited;
    if (region === "body" && !visitBody) continue;
    if (skipTemplates && tag === "template") continue;
    visit(element, region);
    if (OPAQUE.has(tag)) continue;
    // What <html> holds outside <head> and <body> is unplaced, like a fragment.
    const passed: Region = region ?? "unplaced";
    const children = element.children();
    for (let i = children.length - 1; i >= 0; i--) stack.push([children[i]!, passed]);
  }
}
