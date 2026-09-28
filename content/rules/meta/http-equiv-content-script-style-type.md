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

Delete `content-script-type` and `content-style-type`: JavaScript and CSS are the
defaults. HTML 4.01 asked authors to declare the document's default scripting and
style sheet languages, because pages could be written in Tcl or VBScript, among
other contenders:

```html
<META http-equiv="Content-Script-Type" content="text/tcl">
<META http-equiv="Content-Style-Type" content="text/css">
```

That world is gone, and the HTML Standard has no such pragmas: both values
map to no state and are ignored.

## Why avoid

There is nothing to declare. JavaScript is the default scripting language
and CSS the default style language, unconditionally. The tags are pure dead
weight, yet prevalence data still finds them on hundreds of thousands of
sites, copied forward by boilerplates nobody re-reads.

## Use instead

Delete the tag. The one place `type` still matters is per element, for
non-default uses:

```html
<script type="module" src="main.js"></script>
```

## Detectability

Fully detectable. The rule reports either attribute value outright: a
two-branch selector is the whole rule, and the fix always removes the
element.

## Resources

- [HTML 4.01 §18.2.2: Specifying the scripting language](https://www.w3.org/TR/html401/interact/scripts.html): the obsolete origin: default scripting language via Content-Script-Type META.
- [HTML 4.01 §14.2.1: Setting the default style sheet language](https://www.w3.org/TR/html401/present/styles.html): the obsolete origin: default style language via Content-Style-Type META, defaulting to text/css.
- [HTML Standard: Pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives): neither keyword exists in the pragma table, so both map to no state.
