---
ruleId: "attr/script-type-javascript"
title: "<script type=\"text/javascript\">"
description: "A JavaScript MIME type in script[type] is the default; the spec says to omit the attribute."
pubDate: "2026-09-09"
updatedDate: "2026-09-10"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "any"
selector: "script[type]"
match: "logic"
fix: { op: "remove-attribute", attr: "type" }
replacement: "Drop the attribute: <script src=\"app.js\"></script>. Keep type only for module, importmap, speculationrules or a data block."
tags: ["defaults", "scripting"]
impacts: ["maintainability"]
related: ["attr/script-language"]
---

Omit `type="text/javascript"`: it is the default. The spelling dates from a time when the
script language was in
question: Netscape shipped JavaScript, Internet Explorer shipped JScript and VBScript,
and HTML 4.01 made `type` a required attribute with no default. That stopped being true
in HTML5, which defines the classic-script path as what happens when `type` is absent.

## Why avoid

The attribute is the *only* spelling the spec advises
against. A `<script>` whose `type` is a JavaScript MIME type is processed exactly as one
with no `type` at all, and the HTML Standard says authors should omit it. The value is
also a legacy compatibility surface: `text/javascript1.3`, `text/jscript` and
`text/livescript` are still accepted for content that has not been touched since the
1990s, which means a typo like `text/javasript` does not error: it silently makes the
element a data block that never executes.

Carrying it forward teaches the wrong model of the attribute. `type` is now meaningful
and load-bearing: `module`, `importmap` and `speculationrules` change what the element
*is*. Treating it as boilerplate is how `type="module"` ends up deleted by a well-meaning
cleanup.

## Use instead

Omit it for classic scripts:

```html
<script src="/app.js"></script>
<script>console.log("classic script");</script>
```

Keep it wherever it selects behaviour:

```html
<script type="module" src="/app.js"></script>
<script type="importmap">{ "imports": { "lit": "/vendor/lit.js" } }</script>
<script type="application/json" id="state">{ "user": null }</script>
```

## Detectability

Fully detectable, but not by the selector alone. `script[type]` is only a pre-filter: the
verdict depends on whether the trimmed value is a *JavaScript MIME type essence match*,
a sixteen-entry list the selector subset cannot enumerate. The decision therefore lives in
`packages/rules/logic/attr/script-type-javascript.ts`.

Anything the logic does not recognise is left alone, and one exclusion is load-bearing:
a type with parameters, such as `text/javascript; charset=utf-8`, is *not* an essence
match, so the browser treats that element as a data block and never runs it. Removing the
attribute would start executing code that has never executed. The same goes for a typo
like `text/javasript`. Both are real bugs; neither is safe to autofix, so this rule does
not claim them.

## Resources

- [HTML Standard: the `type` attribute](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-type): classic scripts are the no-`type` path; authors should omit it.
- [MIME Sniffing Standard: JavaScript MIME type](https://mimesniff.spec.whatwg.org/#javascript-mime-type): the normative list of essences this rule matches.
- [MDN: `<script>`: `type`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#type): the legacy values and what each modern value selects.
