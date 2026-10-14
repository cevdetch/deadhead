/**
 * `@html-eslint/parser` AST → element port.
 *
 * Five things about this AST differ from the other two adapters, and each one
 * would be a silent drift bug if missed. The conformance suite is what turns
 * them from "silently reports nothing" into a failing test.
 *
 * - `<script>` and `<style>` are not `Tag` nodes. They are `ScriptTag` and
 *   `StyleTag`, and they carry no `name`, so their tag has to be synthesised.
 *   Miss this and every `script/*` rule quietly stops existing in ESLint.
 * - Tag names are lowercased by the parser but **attribute names are not**, so
 *   `HTTP-EQUIV` arrives verbatim. The port promises lowercase.
 * - `loc.column` is 0-based, per ESLint convention. The port promises 1-based,
 *   matching parse5.
 * - A `Doctype` node is raw tokens (`html`, `PUBLIC`, the identifiers), kept in
 *   the author's case and wherever it appeared. The tree builder's rules for
 *   which doctype counts have to be applied here.
 * - Attribute values and text arrive as written, character references and
 *   all: `type="text&#x2F;javascript"` reads `text&#x2F;javascript`. parse5
 *   and the DOM decode them, so this adapter does too (`char-refs.ts`),
 *   except in raw text, where HTML does not.
 *
 * The AST types are described structurally here rather than imported from
 * `@html-eslint/types`, which is a transitive dependency of the parser and not
 * one this package declares.
 */

import { makeDoctypePort, makeDocumentQueries, withPortCache } from "../core/port.ts";
import type { DoctypePort, DocumentPort, ElementPort, Parsed, Range, SourceComment } from "../core/types.ts";
import { decodeAttribute, decodeText } from "./char-refs.ts";

type Node = {
  type: string;
  range?: [number, number];
  loc?: { start: { line: number; column: number } };
  name?: string;
  /** A string on `Text`; a `ScriptTagContent`/`StyleTagContent` node on `ScriptTag`/`StyleTag`. */
  value?: string | Node;
  attributes?: { key: { value: string }; value?: { value: string }; range?: [number, number] }[];
  children?: Node[];
  body?: Node[];
};

/** The node types that stand for an element, and the tag each one means. */
const ELEMENT_TAG = (node: Node): string | null => {
  if (node.type === "Tag") return (node.name ?? "").toLowerCase();
  if (node.type === "ScriptTag") return "script";
  if (node.type === "StyleTag") return "style";
  return null;
};

const childrenOf = (node: Node): Node[] => node.children ?? node.body ?? [];

/**
 * Elements whose contents HTML tokenizes as raw text, with no character
 * references (parse5 runs with scripting on, so `noscript` is one). `script`
 * and `style` are here too, though this AST already keeps them apart.
 */
const RAW_TEXT = new Set(["script", "style", "xmp", "iframe", "noembed", "noframes", "noscript", "plaintext"]);
const TEXT_CONTENT = new Set([...RAW_TEXT, "title", "textarea"]);

/** Preserve literal markup that this AST can misread as child tags/comments. */
function literalTextOf(node: Node, source: string): string | null {
  const tag = ELEMENT_TAG(node);
  if (tag === null || !TEXT_CONTENT.has(tag)) return null;
  const children = childrenOf(node);
  const start = children[0]?.range?.[0];
  const end = children[children.length - 1]?.range?.[1];
  const raw = typeof node.value === "object" && typeof node.value.value === "string" ? node.value.value :
    start !== undefined && end !== undefined ? source.slice(start, end) : "";
  const normalized = raw.replace(/\r\n?/g, "\n");
  const text = RAW_TEXT.has(tag) ? normalized : decodeText(normalized);
  // The HTML tree builder ignores the first newline after <textarea>.
  return tag === "textarea" && text.startsWith("\n") ? text.slice(1) : text;
}

/**
 * Concatenated text of every descendant, in document order.
 *
 * `<script>` and `<style>` have no `Text` children: their contents hang off
 * `value` as a single `ScriptTagContent`/`StyleTagContent` node, so without
 * this they read as empty and a JSON-LD block could never parse.
 */
function textOf(node: Node, source: string): string {
  const literal = literalTextOf(node, source);
  if (literal !== null) return literal;
  let out = "";
  // An explicit stack: markup nested thousands deep is legal HTML, and a
  // recursive walk dies on it. Children are pushed in reverse so they pop in
  // document order.
  const stack = [...childrenOf(node)].reverse();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.type === "Comment") continue;
    const content = literalTextOf(current, source);
    if (content !== null) { out += content; continue; }
    if (current.type === "Text") {
      const value = typeof current.value === "string" ? current.value.replace(/\r\n?/g, "\n") : "";
      out += decodeText(value);
    } else if (typeof current.value === "object") {
      // A nested script/style's content is text, unlike an HTML comment.
      out += typeof current.value.value === "string" ? current.value.value.replace(/\r\n?/g, "\n") : "";
    } else {
      const children = childrenOf(current);
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
    }
  }
  return out;
}

function makePorts(
  parents: WeakMap<Node, Node>,
  elementChildren: WeakMap<Node, Node[]>,
  source: string,
): (node: Node) => ElementPort {
  return withPortCache<Node>((node, portFor) => {
    const attrs = new Map<string, string>();
    const attrRanges = new Map<string, Range>();
    for (const attr of node.attributes ?? []) {
      const name = attr.key.value.toLowerCase();
      // A valueless attribute (`<script defer>`) is the empty string, which is
      // what both `getAttribute` and parse5 report.
      attrs.set(name, decodeAttribute((attr.value?.value ?? "").replace(/\r\n?/g, "\n")));
      if (attr.range) attrRanges.set(name, [attr.range[0], attr.range[1]]);
    }
    let children: ElementPort[] | undefined;

    const port: ElementPort = {
      tag: ELEMENT_TAG(node) ?? "",
      attr: (name) => attrs.get(name.toLowerCase()),
      hasAttr: (name) => attrs.has(name.toLowerCase()),
      attrNames: () => [...attrs.keys()],
      attrRange: (name) => attrRanges.get(name.toLowerCase()) ?? null,
      text: () => textOf(node, source),
      parent: () => {
        const parent = parents.get(node);
        return parent === undefined ? null : portFor(parent);
      },
      children: () => children ??= (elementChildren.get(node) ?? []).map(portFor),
      index: () => {
        const parent = parents.get(node);
        return parent === undefined ? 0 : (elementChildren.get(parent) ?? []).indexOf(node);
      },
      range: (): Range | null => (node.range ? [node.range[0], node.range[1]] : null),
      // ESLint columns are 0-based; the port and parse5 are 1-based.
      loc: () => (node.loc ? { line: node.loc.start.line, col: node.loc.start.column + 1 } : null),
    };

    return port;
  });
}

/** HTML's ASCII whitespace: what the "initial" insertion mode skips. */
const ASCII_WHITESPACE = /^[\t\n\f\r ]*$/;

function assertProgramNode(value: unknown): asserts value is Node {
  if (typeof value !== "object" || value === null) {
    throw new Error(
      "deadhead: unexpected @html-eslint/parser AST (expected a Program node object) — did the parser shape change?",
    );
  }
  if (!("type" in value) && !("children" in value) && !("body" in value)) {
    throw new Error(
      "deadhead: unexpected @html-eslint/parser AST (expected a Program node with children/body) — did the parser shape change?",
    );
  }
}

function doctypeTokens(node: Node): string[] {
  if (!("attributes" in node)) return [];
  const attrs: unknown = node.attributes;
  if (attrs === undefined) return [];
  if (!Array.isArray(attrs)) {
    throw new Error(
      "deadhead: unexpected Doctype token shape (expected an attributes array) — did @html-eslint/parser change?",
    );
  }
  return attrs.map((token: unknown) => {
    if (typeof token !== "object" || token === null || !("value" in token)) return "";
    const inner: unknown = token.value;
    if (typeof inner === "string") return inner;
    if (typeof inner === "object" && inner !== null && "value" in inner) {
      const text: unknown = inner.value;
      return typeof text === "string" ? text : "";
    }
    return "";
  });
}

/**
 * The doctype the tree builder would honour: the first `Doctype` at the top of
 * the document with nothing but comments and whitespace before it. After any
 * text or element, a browser has already left the "initial" insertion mode and
 * ignores the doctype, so the port reports none, exactly as parse5 does.
 */
function doctypeOf(program: Node): DoctypePort | null {
  const document = childrenOf(program).find((child) => child.type === "Document") ?? program;
  let node: Node | undefined;
  for (const child of childrenOf(document)) {
    if (child.type === "Doctype") {
      node = child;
      break;
    }
    if (child.type === "Comment") continue;
    if (child.type === "Text" && typeof child.value === "string" && ASCII_WHITESPACE.test(child.value)) continue;
    return null;
  }
  if (node === undefined) return null;

  // `<!DOCTYPE html PUBLIC "pub" "sys">` arrives as the tokens
  // `html`, `PUBLIC`, `pub`, `sys`, with the quotes already stripped.
  const tokens = doctypeTokens(node);
  const [name = "", keyword = "", first = "", second = ""] = tokens;
  const kind = keyword.toLowerCase();
  const range = node.range;
  const loc = node.loc;

  return makeDoctypePort({
    name,
    publicId: kind === "public" ? first : "",
    systemId: kind === "public" ? second : kind === "system" ? first : "",
    range: (): Range | null => (range ? [range[0], range[1]] : null),
    // ESLint columns are 0-based; the port and parse5 are 1-based.
    loc: () => (loc ? { line: loc.start.line, col: loc.start.column + 1 } : null),
  });
}

/**
 * Wrap a parsed program.
 *
 * `source` is passed through so suppression comments and source-backed
 * findings work exactly as they do in the CLI — unlike the DOM adapter, an
 * ESLint run always has the text in hand.
 */
export function fromProgram(program: unknown, source: string): Parsed {
  assertProgramNode(program);
  const elements: Node[] = [];
  const comments: SourceComment[] = [];
  const parents = new WeakMap<Node, Node>();
  const elementChildren = new WeakMap<Node, Node[]>();
  const byTag = new Map<string, Node[]>();

  // An explicit stack: markup nested thousands deep is legal HTML, and a
  // recursive walk dies on it. Children are pushed in reverse so they pop in
  // document order.
  const roots: Node[] = [];
  const stack: [Node, Node | null][] = [[program, null]];
  while (stack.length > 0) {
    const [node, parent] = stack.pop()!;
    const tag = ELEMENT_TAG(node);
    if (node.type === "Comment" && node.range && node.loc) {
      const text = typeof node.value === "string" ? node.value : node.value?.value;
      if (typeof text === "string") comments.push({ text, line: node.loc.start.line, offset: node.range[0] });
    }
    if (tag !== null) {
      elements.push(node);
      const bucket = byTag.get(tag);
      if (bucket === undefined) byTag.set(tag, [node]);
      else bucket.push(node);
      if (parent !== null) {
        parents.set(node, parent);
        const siblings = elementChildren.get(parent);
        if (siblings === undefined) elementChildren.set(parent, [node]);
        else siblings.push(node);
      } else roots.push(node);
    }
    const children = tag !== null && TEXT_CONTENT.has(tag) ? [] : childrenOf(node);
    for (let i = children.length - 1; i >= 0; i--) stack.push([children[i]!, tag !== null ? node : parent]);
  }

  const portFor = makePorts(parents, elementChildren, source);
  const doctype = doctypeOf(program);
  // @html-eslint/parser invents nothing: an `html` tag is one the author wrote.
  const page = doctype !== null || byTag.has("html");

  const doc: DocumentPort = {
    doctype: () => doctype,
    isPage: () => page,
    ...makeDocumentQueries(elements, byTag, portFor),
  };

  comments.sort((a, b) => a.offset - b.offset);
  return { roots: roots.map(portFor), doc, source, comments };
}
