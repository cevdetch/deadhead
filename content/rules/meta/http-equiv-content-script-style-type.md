---
ruleId: "meta/http-equiv-content-script-style-type"
title: "<meta http-equiv> content-script-type, content-style-type"
description: "The HTML 4.01 default-language declarations have no pragma in the HTML Standard; JavaScript and CSS are the defaults, so delete these tags."
pubDate: "2026-09-14"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="content-script-type" i], meta[http-equiv="content-style-type" i]'
fix: { op: "remove-element" }
replacement: "Delete the tag. JavaScript and CSS are the default languages; declare type per element only for non-default uses."
tags: ["defaults", "http-equiv"]
impacts: ["maintainability"]
related: ["attr/script-type-javascript"]
---

Delete `content-script-type` and `content-style-type`: JavaScript and CSS are the defaults. HTML
4.01 asked authors to declare the document's default scripting and style sheet languages,
because pages could be written in Tcl or VBScript, among other contenders:

```html
<META http-equiv="Content-Script-Type" content="text/tcl">
<META http-equiv="Content-Style-Type" content="text/css">
```

That world is gone, and the HTML Standard has no such pragmas: both values map to no state and
are ignored.

The declarations mattered for code with no `type` of its own. A `<script>` element could name
its language, but an `onclick` attribute or a `style` attribute could not, so HTML 4.01 called a
document with intrinsic event scripts and no default scripting language "incorrect", and said
the same of `style` attributes without a default style sheet language. The META tag, or the HTTP
header of the same name, filled that gap.

## Why avoid

There is nothing to declare. The HTML Standard fixes both languages: "Event handler content
attributes, when specified, must contain valid JavaScript code", a `<script>` without `type` is
a JavaScript classic script, and `style` attributes and `<style>` elements hold CSS. No browser
consults a page-wide default, and no current browser runs Tcl or VBScript in a page.

The tags are dead weight, yet prevalence data still finds them on hundreds of thousands of
sites, copied forward by boilerplates nobody re-reads. A tag that declares `text/javascript`
also invites the next author to add `type="text/javascript"` to every script, another redundancy
that `attr/script-type-javascript` reports.

## Use instead

Delete the tags:

```html
<!-- Before -->
<meta http-equiv="content-script-type" content="text/javascript">
<meta http-equiv="content-style-type" content="text/css">

<!-- After: nothing; JavaScript and CSS need no declaration -->
```

The one place `type` still matters is per element, for non-default uses such as a module script
or a data block:

```html
<script type="module" src="main.js"></script>
<script type="application/ld+json">{"@context": "https://schema.org"}</script>
```

## Detectability

Detectable with one selector: a two-branch selector is the whole rule, matched without regard to
ASCII case. The CLI, the bookmarklet and the ESLint plugin report the same findings, and none
skips. The rule reports either attribute value whatever its `content`, since no value has an
effect, and the fix always removes the element.

## Resources

- [HTML 4.01 §18.2.2: Specifying the scripting language](https://www.w3.org/TR/html401/interact/scripts.html): the obsolete origin: default scripting language via Content-Script-Type META; documents with intrinsic event scripts and no default "are incorrect".
- [HTML 4.01 §14.2.1: Setting the default style sheet language](https://www.w3.org/TR/html401/present/styles.html): the obsolete origin: default style language via Content-Style-Type META, defaulting to text/css.
- [HTML Standard: Pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives): neither keyword exists in the pragma table, so both map to no state.
- [HTML Standard: event handler content attributes](https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-content-attributes): "must contain valid JavaScript code".
