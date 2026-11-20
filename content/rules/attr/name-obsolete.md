---
ruleId: "attr/name-obsolete"
title: "<a name>, <embed name>, <img name> and <option name>"
description: "name on a, embed, img and option is obsolete; the id attribute names fragment targets now."
pubDate: "2026-09-19"
updatedDate: "2026-09-24"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "a[name], embed[name], img[name], option[name]"
match: "logic"
fix: { op: "remove-attribute", attr: "name" }
replacement: "Put id on the target and move links and scripts over to it, then delete name: <h2 id=\"part\">Part</h2> and <a href=\"#part\">Part</a>."
tags: ["hyperlinks"]
impacts: ["maintainability"]
related: ["attr/charset-obsolete"]
---

`name` on `a` is still the fragment-navigation fallback, and on `embed` and `img` it still populates named access on `Window` and `Document`. `option` carries neither. WHATWG lists the attribute as obsolete on all four elements with one replacement, the `id` attribute, but a `name` with no matching `id` keeps working until someone deletes it.

## Why avoid

WHATWG lists all four as obsolete with one replacement. Section 16.2 names `name` on `a`, `embed`, `img` and `option` elements as obsolete, except as noted in the previous section: use the `id` attribute instead. That exception is Section 16.1's warning nuance on `a[name]`, covered below; it does not touch a live processing model. Two separate mechanisms keep a lone `name` live regardless. The "find a potential indicated element" algorithm falls back, when no `id` matches the fragment, to "the first `a` element in the document, in tree order, that has a `name` attribute whose value is equal to fragment", so `a[name]` alone is still a working fragment target. Named access on `Window` and `Document` exposes `window.<name>` and `document.<name>` for `embed`, `img`, `form` and `object` elements carrying that `name`, so a lone `name` on `embed` or `img` is still a script lookup. On `a`, a `name` that duplicates an `id` restates it, because the `id` wins the fragment lookup first. On `img`, it does not: `document.<id>` finds an `img` only while the element also carries a non-empty `name`, so deleting `name` from `<img id="logo" name="logo">` breaks `document.logo` even though the `id` stays.

The warning nuance changes no verdict. Section 16.1 keeps a conformance-checker warning for a non-empty `name` on anchors, distinct from the non-conforming error elsewhere. Both wordings forbid authors from writing the attribute; they differ in how much noise a checker makes. The rule reports each spelling with equal weight and lets the move to `id` end the debate.

## Use instead

Name the target with `id` on any element:

```html
<h2 id="part">Part</h2>
<a href="#part">Part</a>
```

MDN states the same job description: the purpose of `id` is to identify a single element when linking with a fragment identifier, scripting, or styling. One unique name replaces four stray ones.

## Detectability

Complete detection. The rule matches `a[name]`, `embed[name]`, `img[name]` or `option[name]`: presence of the attribute is the whole verdict. A logic module decides only whether the autofix runs. It runs on `option`, whose `name` no navigation or named-access algorithm reads, and on an `a` whose `id` is identical to its `name`, since the fragment lookup finds the `id` before it tries `name`. Every other finding carries no fix. Deleting `name` from any other `a` can break a live fragment link; deleting it from `embed` or `img` can break a `window.<name>`/`document.<name>` lookup, and on `img` it also ends `document.<id>`. A matching `id` covers the fragment case alone; a person has to add the `id`, move script lookups to `getElementById`, and only then remove the attribute.

## Resources

- [WHATWG: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html): `name` on `a`, `embed`, `img` and `option` elements is obsolete: use the `id` attribute instead.
- [MDN: `id`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id): defines the unique identifier and names fragment linking as its purpose.
- [HTML Standard: find a potential indicated element](https://html.spec.whatwg.org/multipage/browsing-the-web.html#find-a-potential-indicated-element): falls back to the first `a` element whose `name` matches the fragment when no `id` matches.
- [HTML Standard: named access on the Window object](https://html.spec.whatwg.org/multipage/nav-history-apis.html#named-access-on-the-window-object): exposes `window.<name>`/`document.<name>` for `embed`, `form`, `img` and `object` elements with a non-empty `name`.
- [HTML Standard: named elements on the Document](https://html.spec.whatwg.org/multipage/dom.html#dom-document-nameditem-filter): an `img` is a named element by its `id` only when it also has a non-empty `name`.
