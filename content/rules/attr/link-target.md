---
ruleId: "attr/link-target"
title: "<link target>"
description: "target on link is unnecessary; links load in the current context by default, so delete it."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "head"
selector: "link[target]"
fix: { op: "remove-attribute", attr: "target" }
replacement: "Delete the attribute: <link href=\"main.css\" rel=\"stylesheet\">."
tags: ["hyperlinks"]
impacts: ["maintainability"]
related: ["attr/methods"]
---

`target` on `link` selects nothing. The HTML Standard calls the attribute unnecessary, with one
direction: omit it altogether. Resource loads never consult a browsing-context name, so a
stylesheet, icon or preload loads into the page that holds it.

The attribute dates from framesets. HTML 4.01's loose DTD put `target` on `LINK` as well as on
`A`, `AREA`, `BASE` and `FORM`, described as "render in this frame". The idea was that a link to
a related document could say which frame should show it. No browser built navigation on `link`
elements, and the frame model it served left HTML with `<frameset>`.

## Why avoid

The HTML Standard's list of non-conforming features names `target` on `link` elements:
"Unnecessary. Omit it altogether." The W3C HTML markup reference called the attribute obsolete
and safe to omit. The standard keeps a `target` IDL attribute on `HTMLLinkElement` that reflects
the content attribute, so script can read it back, and no fetch or navigation reads it.

On `a`, `area` and `form`, `target` chooses where a navigation opens. On `link` there is no
navigation to direct: `stylesheet`, `icon`, `preload` and `modulepreload` fetch into the current
document, and hyperlink types such as `alternate` or `next` are annotations a browser does not
follow on its own. A `target="_self"` restates the only behaviour there is, and a
`target="_blank"` is ignored. A reader who sees `_blank` on a `link` can expect a new tab that
never opens.

## Use instead

Delete the attribute:

```html
<!-- Before -->
<link href="main.css" rel="stylesheet" target="_self">

<!-- After -->
<link href="main.css" rel="stylesheet">
```

Where the intent was to open a related page in another context, that belongs on a visible link
the visitor can follow: `<a href="/print" target="_blank">Print version</a>`. A page-wide
default target for links and forms is `<base target>`, which `head/base-multiple` and
`head/base-position` cover.

## Detectability

Detectable with one selector: `link[target]`. Presence of the attribute is the whole verdict, so
no logic module exists. The CLI, the bookmarklet and the ESLint plugin report the same findings,
and none skips. The autofix removes the attribute and leaves every other attribute as written.
Anchors keep their live `target`; the rule never matches `a`.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `target` on `link` elements, "Unnecessary. Omit it altogether."; the `HTMLLinkElement` partial interface that still reflects it.
- [HTML 4.01: index of attributes](https://www.w3.org/TR/html401/index/attributes.html): `target` on `A`, `AREA`, `BASE`, `FORM` and `LINK` in the loose DTD, "render in this frame".
- [W3C: `link` markup reference](http://w3c.github.io/html-reference/link.html): the attribute is obsolete and omission is safe.
