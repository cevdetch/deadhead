---
description: "The first Web Components drafts, Shadow DOM v0 and HTML Imports, which only Chrome shipped and then removed, and what replaced them."
---

Web Components shipped twice. The first version, now called v0, was Chrome's: Shadow DOM v0
with its `<content>` and `<shadow>` insertion points, Custom Elements v0, and HTML Imports
loaded through `<link rel="import">`. No other engine adopted it. The standard that every
browser ships today, v1, kept the ideas and changed the markup: a host has one shadow root,
which takes the host's children through
[`<slot>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/slot), and
components load as JavaScript modules.

Chrome deprecated v0 in version 70 and removed it over the following releases. HTML Imports
went in Chrome 80, in early 2020. Since then the old markup does nothing in any browser:
`<content>` and `<shadow>` parse as unknown elements and distribute nothing, and an import
link loads nothing. The leftovers still look like working component plumbing, which is why
they are worth reporting.

Deadhead reports three:

- [`element/content`](/rules/element/content) and [`element/shadow`](/rules/element/shadow),
  both deprecated. Neither has an autofix: either can hold fallback content that renders
  today, and rebuilding the composition with `<slot>` is a manual edit.
- [`link/import`](/rules/link/import), unnecessary. The fix removes the keyword, or the
  element when nothing else is left in `rel`. Load the component with
  `<script type="module">` instead.

The [DOM Standard](https://dom.spec.whatwg.org/#shadow-tree-slots) defines the v1 model:
slots and the nodes assigned to them, with no insertion-point element.
