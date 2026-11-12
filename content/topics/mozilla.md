---
description: "Two Firefox-only link relations that Mozilla removed, Microsummaries and sidebar links, and why deadhead reports what is left of them."
---

Firefox once read two link relations that no other browser did. Both are gone from Firefox
as well, and neither entered a standard: the HTML Standard's
[list of link types](https://html.spec.whatwg.org/multipage/links.html#linkTypes) has no
entry for either.

`<link rel="microsummary">` pointed at a generator for a live bookmark title: a short,
regularly updated summary of the page that Firefox showed in place of the bookmark's name.
Mozilla removed Microsummaries in Firefox 6 as seldom used, undiscoverable and unmaintained,
and later swept the remaining code out of bookmarks.

`<link rel="sidebar">` asked Firefox to open the linked page in its sidebar panel. Firefox
63 removed the feature as buggy and complex. Every other engine had always treated such a
link as an ordinary one.

What is left in old templates is dead weight that suggests a feature still works. Deadhead
reports each as unnecessary:

- [`link/microsummary`](/rules/link/microsummary)
- [`link/sidebar`](/rules/link/sidebar)

Both fixes remove the keyword from `rel`, and the whole element when no other keyword is
left. If the page still wants a link to what the sidebar showed, write a plain
`<a href>` in the body.

[`<menuitem>`](/rules/element/menuitem), a menu command only Firefox shipped and removed in
Firefox 103, is listed under [scripting](/topics/scripting) rather than here: the HTML
Standard defined it for a while, so it was never Mozilla's alone.
