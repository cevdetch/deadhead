/**
 * Live DOM → element port.
 *
 * The bookmarklet's whole advantage is that it inspects *rendered* output:
 * whatever the framework, the CMS or the tag manager actually put in the
 * document, rather than what the source said. That is ground truth in a way
 * a file on disk is not.
 *
 * The cost is that there is no source text. `range()` and `loc()` return
 * `null`, fixes are unavailable, and suppression comments are not read. Every
 * one of those degrades to "unavailable" rather than to something wrong.
 */

import { makeDoctypePort, withPortCache } from "../core/port.ts";
import type { DoctypePort, DocumentPort, ElementPort, Parsed } from "../core/types.ts";

const isTemplate = (element: Element): element is HTMLTemplateElement =>
  element.tagName.toLowerCase() === "template" && "content" in element;

/**
 * A `<template>`'s markup lives in its `content` fragment, not among its
 * children — the same trap the parse5 adapter has. Both adapters have to step
 * into it or the conformance suite compares two different documents.
 */
const childElements = (element: Element): Element[] =>
  isTemplate(element) ? [...element.content.children] : [...element.children];

function makePorts(): (element: Element) => ElementPort {
  return withPortCache<Element>((element, portFor) => {
    // getAttribute lowercases its argument only for HTML elements in an HTML
    // document. On SVG and MathML it compares exactly, and the parser has
    // already written `viewBox`, `baseProfile`. One lowercased map, built on
    // first use, keeps the port's case-insensitive promise everywhere. The
    // first attribute of a name wins, as it does for getAttribute.
    let attrs: Map<string, string> | undefined;
    const attrMap = (): Map<string, string> => {
      if (attrs === undefined) {
        attrs = new Map();
        for (const { name, value } of element.attributes) {
          const key = name.toLowerCase();
          if (!attrs.has(key)) attrs.set(key, value);
        }
      }
      return attrs;
    };

    const port: ElementPort = {
      // `tagName` is uppercase for HTML elements in a real document.
      tag: element.tagName.toLowerCase(),
      attr: (name) => attrMap().get(name.toLowerCase()),
      hasAttr: (name) => attrMap().has(name.toLowerCase()),
      attrNames: () => [...attrMap().keys()],
      // No source text, so no attribute range either — and therefore no fixes.
      attrRange: () => null,
      text: () => element.textContent ?? "",
      parent: () => {
        // A template's content lives in a fragment, so climb back to the
        // template element rather than stopping at the fragment.
        const parent = element.parentElement;
        if (parent !== null) return portFor(parent);
        const host = (element.parentNode as { host?: Element } | null)?.host;
        return host === undefined ? null : portFor(host);
      },
      children: () => childElements(element).map(portFor),
      index: () => {
        const parent = element.parentElement;
        return parent === null ? 0 : childElements(parent).indexOf(element);
      },
      // No source text in a live document: there is nothing to splice.
      range: () => null,
      loc: () => null,
    };

    return port;
  });
}

/**
 * `document.doctype` in a browser is already the doctype the tree builder
 * honoured. The name is lowercased anyway because linkedom, the DOM the tests
 * run against, keeps the author's case where a browser would not.
 */
function doctypeOf(document: Document): DoctypePort | null {
  const node = document.doctype;
  if (node === null) return null;
  return makeDoctypePort({
    name: node.name,
    publicId: node.publicId,
    systemId: node.systemId,
    // No source text in a live document.
    range: () => null,
    loc: () => null,
  });
}

/**
 * Wrap a live document.
 *
 * `querySelector`/`querySelectorAll` hand the selector straight to the
 * browser. That is the reason the supported subset is restricted to things
 * `querySelectorAll` accepts verbatim: no translation layer, no second
 * implementation to keep in step.
 */
export function fromDocument(document: Document): Parsed {
  const portFor = makePorts();
  const root = document.documentElement;

  const doc: DocumentPort = {
    doctype: () => doctypeOf(document),
    // A live document is the page the browser assembled from whatever files
    // produced it, so it is never a fragment.
    isPage: () => true,
    querySelector: (selector) => {
      const found = document.querySelector(selector);
      return found === null ? null : portFor(found);
    },
    querySelectorAll: (selector) => [...document.querySelectorAll(selector)].map(portFor),
  };

  return { roots: root === null ? [] : [portFor(root)], doc, source: null };
}
