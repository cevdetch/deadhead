---
ruleId: "head/base-multiple"
title: "more than one base element"
description: "Only the first base href and target count; a second base with another URL misleads every edit to the page's links."
pubDate: "2026-09-21"
status: "avoid"
severity: "harmful"
standardsBasis: "spec"
detectability: "yes"
kind: "document"
scope: "any"
match: "logic"
fix: { op: "none" }
replacement: "Fold the first href and the first target onto a single base: <base target=\"_top\" href=\"https://example.com/\">. Delete the rest."
tags: ["one-per-page"]
impacts: ["interop", "maintainability"]
related: ["document/html-lang"]
---

A document holds at most one `base` element. Each element past the first trips this rule.

## Why avoid

The Standard caps the count at one. Every `href` and every `target` past the first is ignored.

The ignore rule splits by attribute. The first `href` wins its race and the first `target` wins its own, even when they sit on different elements.

That split makes extras treacherous. An editor deleting the "duplicate" can drop the live target, and an editor fixing URLs edits a copy nothing reads.

A lone `base` sets every relative URL and every default navigation target in the document. A stray second one invites confusion about which tag governs what.

## Use instead

One base carrying both attributes:

```html
<base target="_top" href="https://example.com/">
```

## Detectability

Countable in one document pass, which is why this is a `kind: "document"` rule: no selector can count to two. The logic in `packages/rules/logic/head/base-multiple.ts` lists the `base` elements once and reports each one past the first. The check reads the tree, never source offsets, so it reports in all three adapters.

## Resources

- [WHATWG HTML: the base element](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element): at most one `base` per document, with all-but-first `href` and `target` ignored as separate races.
- [MDN: `<base>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/base): a single `base` in a document, first `href` and first `target` obeyed, plus the fragment-anchor resolution gotcha.
