---
ruleId: "attr/menu-type-label"
title: "<menu type, label>"
description: "type and label on menu are obsolete; script contextmenu handling covers custom menus, toolbars drop them."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "menu[type], menu[label]"
fix: { op: "remove-attributes" }
replacement: "Delete the attributes. For custom menus handle contextmenu in script; for toolbars drop the attributes."
tags: ["scripting"]
impacts: ["maintainability"]
related: ["attr/contextmenu-onshow"]
---

`type` and `label` on `menu` select nothing. The HTML Standard lists both as obsolete: custom
context menus run on the `contextmenu` event in script, and toolbar menus drop the attributes.

Both belonged to HTML5's context-menu feature. A `<menu type="context" label="Tools">` held the
commands, an element's `contextmenu` attribute pointed at it, and the browser added those
commands to its own right-click menu. `type="toolbar"` was the other value, for a menu shown on
the page. Firefox was the one browser to ship the context-menu half.

## Why avoid

The feature left HTML in 2017. whatwg/html#2742, "Remove the context menu feature", took out
`<menuitem>`, the `contextmenu` attribute and `menu[type]`, and Mozilla's bug tracking the
removal states the reason: "we removed the context menu feature from HTML due to lack of
implementer interest". The standard's list of non-conforming features names `type` on `menu`,
"To implement a custom context menu, use script to handle the contextmenu event. For toolbar
menus, omit the attribute", and `label` on `menu` with the same direction.

Firefox followed. Its release notes for version 85 record that `<menuitem>` "has been hidden
behind the dom.menuitem.enabled flag", and bug 1372276 removed the code in Firefox 103. Today
`<menu>` is a list of commands: MDN calls it a toolbar of commands that the standard describes
as "a semantic alternative to `<ul>`", and browsers treat it the same as `<ul>`. A
`type="toolbar"` restates that, and a `type="context"` names a feature no browser offers.
Neither attribute changes how the list renders.

## Use instead

A toolbar needs no attributes at all:

```html
<!-- Before -->
<menu type="toolbar" label="Edit">
  <li><button>Copy</button></li>
</menu>

<!-- After -->
<menu>
  <li><button>Copy</button></li>
</menu>
```

A custom context menu runs on the `contextmenu` event, which fires on a right click or the
keyboard's menu key:

```js
target.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  showMenu(event.clientX, event.clientY);
});
```

A menu built this way needs its own keyboard handling and focus management, which the browser's
native menu provided. Where a label was the visible heading of a toolbar, give the `<menu>` an
`aria-label` or a visible heading instead.

## Detectability

Detectable with one selector: `menu[type]` or `menu[label]`. Presence of either attribute is the
whole verdict, so no logic module exists. The CLI, the bookmarklet and the ESLint plugin report
the same findings, and none skips. The autofix removes every attribute the rule names that is
present on the element, and leaves every other attribute as written. `attr/contextmenu-onshow`
covers the `contextmenu` attribute on the element that pointed at the menu.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `type` on `menu`, "To implement a custom context menu, use script to handle the contextmenu event. For toolbar menus, omit the attribute"; `label` on `menu`.
- [whatwg/html#2742: Remove the context menu feature](https://github.com/whatwg/html/pull/2742): the 2017 removal of `<menuitem>`, `contextmenu` and `menu[type]`.
- [Mozilla bug 1372276](https://bugzilla.mozilla.org/show_bug.cgi?id=1372276): "Remove HTML context menu (`<menu>` and `<menuitem>` tag) support", fixed in Firefox 103, removed "due to lack of implementer interest".
- [MDN: Firefox 85 for developers](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/85): `<menuitem>` "has been hidden behind the dom.menuitem.enabled flag".
- [MDN: `<menu>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/menu): "a semantic alternative to `<ul>`", a toolbar of commands, treated by browsers as no different from `<ul>`.
