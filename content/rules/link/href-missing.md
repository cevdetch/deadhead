---
ruleId: "link/href-missing"
title: "<link> without href or imagesrcset"
description: "A link with no href, no imagesrcset and no itemprop defines no link."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link:not([href]):not([imagesrcset]):not([itemprop])'
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete the element. If a resource was meant, name it: <link rel=\"stylesheet\" href=\"main.css\">."
tags: ["hyperlinks"]
impacts: ["maintainability"]
related: ["link/preload-as-missing"]
---

A `link` with no `href`, no `imagesrcset` and no `itemprop` defines no link. The element fetches nothing and navigates nowhere.

## Why avoid

WHATWG demands `href` or `imagesrcset`, and states that absent both, the element defines no link.

Dead links of this shape come from edits that delete a URL but spare the tag. They sit in `head` unread, costing bytes and review time.

Microdata is no excuse here. A `link` carrying `itemprop` answers to a different model and never trips this rule.

## Use instead

Delete the tag. If the page needs the resource, give its address:

```html
<link rel="stylesheet" href="main.css">
```

## Detectability

Detectable with the selector alone. Each `:not` pins one address attribute absent, so the rule trips when all three are gone; any one present keeps it quiet. Microdata links stay quiet through the `itemprop` guard.

A link with an `id` or a `data-*` attribute is reported but not deleted. Those mark a hook a script fills in: a lazy stylesheet, a theme switch, a head manager's slot. HTML fetches an external resource link when its `href` "is changed", so the element goes live the moment a script sets one. In the top 10,000 crawl of 2026-10-04, 16 of 20 sampled findings were such hooks. Delete one only after finding the script that writes it.

## Resources

- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): `href` or `imagesrcset` has to be present, and absent both the element defines no link.
- [WHATWG HTML: link type "stylesheet"](https://html.spec.whatwg.org/multipage/semantics.html#link-type-stylesheet): the link is fetched and processed when its element becomes connected and "when the href attribute of the link element of an external resource link that is already browsing-context connected is changed".
- [MDN: `<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link): the implicit ARIA role is a link with an `href` attribute, and every example carries one.
