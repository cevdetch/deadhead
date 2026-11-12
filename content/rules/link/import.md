---
ruleId: "link/import"
title: "<link rel=\"import\">"
description: "A Chrome-alone component loader removed in Chrome 80; no other engine ever shipped it."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="import" i]'
fix: { op: "remove-tokens", attr: "rel" }
replacement: "Delete the tag, or only the keyword when rel also holds live ones. Ship the component through ES modules and v1 custom elements instead."
tags: ["web-components"]
impacts: ["maintainability"]
related: ["link/subresource"]
---

A `link rel=import` promises component delivery and delivers nothing. Chrome removed HTML
Imports in version 80 with the rest of Web Components v0.

HTML Imports let a page load another HTML document, with its templates, styles and scripts,
through a `<link>` in the head. The imported document ran its scripts in the importing page, and
libraries such as Polymer shipped their components as these files. Chrome carried the feature
alone from 2014. No other engine shipped it, and the component model moved to custom elements,
shadow DOM and JavaScript modules instead.

## Why avoid

Chrome 80 removed Web Components v0, with HTML Imports named among them: "Web Components v0 are
now removed from Chrome. The Web Components v1 APIs are a web platform standard that has shipped
in Chrome, Safari, Firefox". web.dev's original HTML Imports article now opens with the warning
that they "are deprecated and was removed from Chrome in February 2020". No other engine ever
shipped the token.

The v0 draft never became a shared standard. The HTML Standard's list of supported `rel` tokens,
the list `relList.supports()` answers from, names thirteen keywords with no `import` among them,
and `document.createElement("link").relList.supports("import")` returns `false` in every current
browser.

A tag promising delivery while delivering nothing is worse than absent. The browser fetches
nothing, so the component the page wants never loads: its templates stay out of the page, its
custom element is never defined, and the element in the body stays an undefined element, inline
by default, showing only its light-DOM content. The reader of the head assumes the loader story
is handled.

## Use instead

Move the component into a JavaScript module and define it with the v1 custom elements API. The
module carries the template and the styles that the imported HTML file used to hold:

```html
<!-- Before: Chrome 80 and later fetch nothing -->
<link rel="import" href="/components/my-el.html">

<!-- After -->
<script type="module" src="/components/my-el.js"></script>
```

```js
// /components/my-el.js
const template = document.createElement("template");
template.innerHTML = `<style>:host { display: block; }</style><slot></slot>`;

customElements.define("my-el", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).append(template.content.cloneNode(true));
  }
});
```

A module is fetched and evaluated once per page however many times it is imported, as an HTML
import was, and `import` statements inside it replace the nested `<link rel="import">` chains.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `rel` matches with `~=` because it is a space-separated token
set, and the `i` flag folds case. No engine ships support for the token, so every match trips
the rule. The fix removes the `import` keyword, and the element with it when no other keyword is
left; nothing loads either way, so no behaviour changes.

## Resources

- [Chrome: deprecations and removals in Chrome 80](https://developer.chrome.com/blog/chrome-80-deps-rems): Web Components v0 removed, HTML Imports named, with intent links.
- [web.dev: HTML Imports](https://web.dev/articles/imports): "HTML Imports are deprecated and was removed from Chrome in February 2020", atop the original 2013 announcement.
- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): the possible supported tokens for `rel` list thirteen keywords with no `import` among them.
- [MDN: Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements): `customElements.define()` and the v1 lifecycle that replaced the v0 APIs.
