---
ruleId: "link/wlwmanifest"
title: "<link rel=\"wlwmanifest\">"
description: "A manifest pointer for a writer discontinued in 2017 and dropped from WordPress 6.3."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'link[rel~="wlwmanifest" i]'
fix: { op: "remove-tokens", attr: "rel" }
replacement: "Delete the tag, or only the keyword when rel also holds live ones."
tags: ["microsoft"]
impacts: ["maintainability"]
related: ["link/subresource"]
---

A `link rel=wlwmanifest` points a desktop blog editor at a manifest file that most sites no
longer ship. Windows Live Writer is discontinued, and WordPress 6.3 removed the file with all
references.

Windows Live Writer was Microsoft's desktop editor for blogs. When a user added a blog, it read
the home page and looked for a `wlwmanifest.xml` file describing the blog's editing
capabilities. WordPress added `wlwmanifest_link()` in version 2.3.1 and printed its
`<link rel="wlwmanifest">` through `wp_head`, pointing at `/wp-includes/wlwmanifest.xml`, on
sites whose authors never used the editor.

## Why avoid

Microsoft ended support for Windows Essentials 2012, Writer included, on 10 January 2017: it "is
no longer supported on Windows 10, and is unavailable for download". WordPress followed in 6.3,
released in August 2023: `wlwmanifest_link()` is deprecated because the "WLW manifest is no
longer in use and no longer included in core, so the output from this function is removed". A
WordPress 6.3 site that still prints the tag gets it from a theme or plugin, and the file it
points at is gone.

It never entered any standard. The HTML Standard's list of supported `rel` tokens, the list
`relList.supports()` answers from, names thirteen keywords with no `wlwmanifest` among them.

A tag pointing at a missing file is worse than absent. It advertises an integration that answers
404, and it tells every visitor, crawler and scanner which software runs the site.

One reader remains. Open Live Writer, the open-source fork of the editor, still looks for a
manifest when a blog is added: first at `wlwmanifest.xml` under the blog's home URL, then
through this link on the home page. The manifest is optional for the editor: when neither lookup
finds one, adding the blog goes on without it.

## Use instead

Delete the tag:

```html
<!-- Before -->
<link rel="wlwmanifest" type="application/wlwmanifest+xml" href="https://example.com/wp-includes/wlwmanifest.xml">

<!-- After: nothing -->
```

On WordPress before 6.3, `remove_action( 'wp_head', 'wlwmanifest_link' );` in the theme stops
the output; on 6.3 and later, core prints nothing and the line can go. A site that serves its
own manifest for Open Live Writer users can place it at `wlwmanifest.xml` under the home URL,
where the editor checks first, and drop the link. Modern editors connect through the platform's
own API or application, not through head markup.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. `rel` matches with `~=` because it is a space-separated token
set, and the `i` flag folds case. No browser reads the token, so every match trips the rule. The
fix removes the `wlwmanifest` keyword, and the element with it when no other keyword is left.

## Resources

- [WordPress: `wlwmanifest_link()`](https://developer.wordpress.org/reference/functions/wlwmanifest_link/): "This function has been deprecated since 6.3.0. WLW manifest is no longer in use and no longer included in core"; introduced in 2.3.1.
- [WordPress PR 4276: remove wlwmanifest.xml from core](https://github.com/WordPress/wordpress-develop/pull/4276): removes the manifest, the hook output and the references, committed for 6.3.
- [Microsoft: support for Windows Essentials apps](https://support.microsoft.com/en-gb/windows/support-for-windows-essentials-apps-364adece-b947-43cb-68ce-8f4a6b2c22fd): Essentials 2012, Writer included, "no longer supported on Windows 10, and is unavailable for download" as of 10 January 2017.
- [Open Live Writer: `WriterEditingManifest.cs`](https://github.com/OpenLiveWriter/OpenLiveWriter/blob/master/src/managed/OpenLiveWriter.BlogClient/Detection/WriterEditingManifest.cs): the fork checks `wlwmanifest.xml` under the home URL, then a `rel="wlwmanifest"` link on the home page.
- [WHATWG HTML: the link element](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element): the possible supported tokens for `rel` list thirteen keywords with no `wlwmanifest` among them.
