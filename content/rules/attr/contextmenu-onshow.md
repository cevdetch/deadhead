---
ruleId: "attr/contextmenu-onshow"
title: "<contextmenu, onshow>"
description: "contextmenu and onshow are obsolete; script event handling replaces them, so delete the attributes."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "[contextmenu], [onshow]"
fix: { op: "remove-attributes" }
replacement: "Delete the attributes. Handle the contextmenu event in script: target.addEventListener(\"contextmenu\", show)."
tags: ["scripting"]
impacts: ["maintainability"]
related: ["attr/menu-type-label"]
---

`contextmenu` and `onshow` name menus nothing builds. They belonged to a declarative context
menu: `contextmenu` pointed an element at a `<menu type="context">` by `id`, and the browser
fired a `show` event at that menu, which `onshow` handled, before adding its `<menuitem>`
entries to the right-click menu. The HTML Standard now lists both attributes as obsolete, with
script handling of the `contextmenu` event as the replacement.

## Why avoid

The HTML Standard names `contextmenu` and `onshow` "on all elements" among the non-conforming
features: "To implement a custom context menu, use script to handle the `contextmenu` event."
The `menu` and `menuitem` parts of the feature went with them, `menuitem` under the same
instruction.

Firefox was the browser that shipped it. Mozilla implemented the `contextmenu` attribute in
Firefox 8 and removed HTML context menus, with `<menu type="context">` and `<menuitem>`, in
Firefox 103 (bug 1372276, resolved in June 2022). MDN's compatibility data no longer lists the
global attribute at all. In every current browser the attribute is an unknown one: the default
context menu appears unchanged, and the `show` event never fires, so the `onshow` handler never
runs.

What is left is markup that describes a menu the page does not have. A reader sees a menu wired
to the element and looks for it; the `<menu>` it points at, if it is still in the page, is an
ordinary list to the browser.

## Use instead

Handle the event in script, and build the menu as part of the page:

```html
<!-- Before -->
<div contextmenu="tools">Tools</div>
<menu type="context" id="tools" onshow="prepare()">
  <menuitem label="Rename"></menuitem>
</menu>

<!-- After -->
<div id="tools-target">Tools</div>
<script>
  document.getElementById("tools-target").addEventListener("contextmenu", (event) => {
    event.preventDefault();
    showMenu(event.clientX, event.clientY);
  });
</script>
```

MDN's `contextmenu` event page covers the live mechanism: the event fires on a right-click or
the context-menu key, and `preventDefault()` suppresses the browser's own menu. The custom menu
is the page's job, including keyboard access and focus handling, since nothing in the browser
builds it. A visible button for the same actions also reaches touch users.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. The rule matches `[contextmenu]` or `[onshow]` on any element;
neither alternative leads with a tag, so the rule dispatches from the wildcard bucket like any
document-wide check. `oncontextmenu` is a different, live attribute and stays quiet. The autofix
removes every attribute the rule names that is present on the element, and leaves every other
attribute as written; no current browser reads either one. The `<menu type="context">` itself is
a matter for `attr/menu-type-label`.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `contextmenu` and `onshow` on all elements are obsolete: "use script to handle the contextmenu event".
- [MDN: `contextmenu` event](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event): the event fires on right-click for `addEventListener` or `oncontextmenu` handling, and can be cancelled.
- [Mozilla bug 617528](https://bugzilla.mozilla.org/show_bug.cgi?id=617528): the `contextmenu` attribute implemented in Firefox 8.
- [Mozilla bug 1372276](https://bugzilla.mozilla.org/show_bug.cgi?id=1372276): "Remove HTML context menu (`<menu>` and `<menuitem>` tag) support", fixed for Firefox 103.
