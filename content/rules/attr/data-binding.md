---
ruleId: "attr/data-binding"
title: "<datasrc, datafld, dataformatas> attributes"
description: "datasrc, datafld and dataformatas are obsolete IE data hooks; populate the page with script instead."
pubDate: "2026-09-21"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "any"
selector: "a[datasrc], button[datasrc], div[datasrc], frame[datasrc], iframe[datasrc], img[datasrc], input[datasrc], label[datasrc], legend[datasrc], marquee[datasrc], object[datasrc], option[datasrc], select[datasrc], span[datasrc], table[datasrc], textarea[datasrc], a[datafld], button[datafld], div[datafld], fieldset[datafld], frame[datafld], iframe[datafld], img[datafld], input[datafld], label[datafld], legend[datafld], marquee[datafld], object[datafld], select[datafld], span[datafld], textarea[datafld], button[dataformatas], div[dataformatas], input[dataformatas], label[dataformatas], legend[dataformatas], marquee[dataformatas], object[dataformatas], option[dataformatas], select[dataformatas], span[dataformatas], table[dataformatas]"
fix: { op: "remove-attributes" }
replacement: "Populate the page with script and XHR, then delete the hooks: <span id=\"name\"></span>."
tags: ["microsoft", "scripting"]
impacts: ["maintainability"]
related: []
---

`datasrc`, `datafld` and `dataformatas` bind nothing. They were the markup half of Internet
Explorer's data binding, and the HTML Standard lists all three as obsolete, with script and a
fetch mechanism as the replacement.

Microsoft introduced data binding with Internet Explorer 4.0. A page embedded a data source
object, such as the Tabular Data Control, an ActiveX control that read a delimited text file, or
an XML data island. `datasrc="#orders"` on a `<table>` handed it to the "table repetition
agent", which repeated its rows once per record, and `datafld="name"` on a `<span>` or `<input>`
showed one field of the current record. `dataformatas` set the "rendering format for the data",
such as `text` or `html`. Microsoft's documentation describes "native data binding facilities"
with "minimal scripting required".

## Why avoid

The HTML Standard names `datasrc`, `datafld` and `dataformatas` across their elements among the
non-conforming features: "Use script and a mechanism such as XMLHttpRequest to populate the page
dynamically." The hooks bound page elements to recordsets in an engine that no longer exists.
The standard keeps no IDL member for any of the three, and MDN's compatibility data has no entry
for them.

What is left is markup that shows the page's design at the time and nothing else. A
`<span datafld="name">Ada</span>` displays its static text, `Ada`, in every current browser, so
the page can look filled in while no data arrives. A `<table datasrc>` shows the one template
row it holds, not one row per record.

The W3C Recommendation prints the same verdict. Its obsolete-features chapter names the same
three attributes with the same direction, script plus `XHR`, though its 2014 element lists still
include `applet` and, for `datafld`, `param`: both elements left HTML since.

## Use instead

Fetch the data and write it into the page from script, then delete the hooks:

```html
<!-- Before -->
<span datasrc="#users" datafld="name">Ada</span>

<!-- After -->
<span id="name"></span>
<script type="module">
  const user = await (await fetch("/user.json")).json();
  document.getElementById("name").textContent = user.name;
</script>
```

Use `textContent` for plain fields, the counterpart of `dataformatas="text"`. A field that held
HTML, the `dataformatas="html"` case, needs sanitising before it goes into the page. Where the
data is known when the page is served, render it on the server and skip the script altogether.
For repeated rows, a `<template>` element cloned once per record replaces the `<table datasrc>`
repetition.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. The rule matches `datasrc`, `datafld` or `dataformatas` on the
elements the HTML Standard lists for each attribute: presence of any of the three on its owning
element is the whole verdict, so no logic module exists. Every alternative names a tag, so the
rule dispatches by element and not from the wildcard bucket. The autofix removes every attribute
the rule names that is present on the element, and leaves every other attribute as written; no
current browser reads them, so the page renders the same.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `datasrc`, `datafld` and `dataformatas` are obsolete: "Use script and a mechanism such as XMLHttpRequest to populate the page dynamically."
- [Microsoft: Introduction to Data Binding](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/ms531387(v=vs.85)): "Internet Explorer 4.0 and later enables content providers to develop data-centric Web applications" through data source objects.
- [Microsoft: Data Binding](https://learn.microsoft.com/en-us/previous-versions/ms531388(v=vs.85)): the DSO, data consumers, the binding agent and "the table repetition agent"; the Tabular Data Control, "a Microsoft ActiveX control" for delimited text files.
- [Microsoft: `dataFormatAs` property](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/jj160678(v=vs.85)): "the rendering format for the data supplied to the object", with `html` and `text` values.
- [W3C: HTML5 Obsolete features](https://www.w3.org/TR/2014/REC-html5-20141028/obsolete.html#non-conforming-features): the same three attributes with the same script direction.
- [MDN: `<template>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template): a fragment of markup cloned from script, the modern way to repeat rows.
