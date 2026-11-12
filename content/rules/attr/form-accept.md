---
ruleId: "attr/form-accept"
title: "<form accept>"
description: "accept on form is obsolete; the file inputs carry it now, so delete it from the form."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "form[accept]"
fix: { op: "remove-attribute", attr: "accept" }
replacement: "Delete the attribute and put accept on each file input: <input type=\"file\" accept=\"image/*\">."
tags: ["forms"]
impacts: ["maintainability"]
related: []
---

`accept` on `form` filters nothing. The HTML Standard lists the attribute as obsolete on forms,
with one replacement: "Use the accept attribute directly on the input elements instead."

HTML 4.01 defined `accept` on `FORM` as "a comma-separated list of content types that a server
processing this form will handle correctly", which user agents "may use" to "filter out
non-conforming files when prompting a user to select files". One value applied to every file
field in the form. HTML5 moved the hint to the file input itself, where each field can accept
its own types.

## Why avoid

The HTML Standard's list of non-conforming features names `accept` on `form` elements: "Use the
accept attribute directly on the input elements instead." The current `accept` attribute is
defined on `<input type="file">` alone, and MDN's `accept` page records that it was once
supported on `<form>` and was removed in favour of the file input.

A form-level value does not reach the file picker. The dialog shows every file type, and the
author who wrote `accept="image/*"` on the form believes images are the only option offered.
Even on the input, `accept` is a hint for the picker, not a validation: a visitor can still
choose another file, so the server has to check the type it receives either way.

## Use instead

Move the value to each file input, and keep checking the upload on the server:

```html
<!-- Before -->
<form method="post" enctype="multipart/form-data" accept="image/*">
  <input type="file" name="shot">
</form>

<!-- After -->
<form method="post" enctype="multipart/form-data">
  <label for="shot">Choose a shot</label>
  <input type="file" id="shot" name="shot" accept="image/png, image/jpeg">
  <button>Submit</button>
</form>
```

The input's `accept` takes a comma-separated list of MIME types, wildcards such as `image/*`,
and file extensions such as `.pdf`. A form with several file inputs can give each its own list.

## Detectability

Detectable with one selector: `form[accept]`. Presence of the attribute is the whole verdict, so
no logic module exists. The CLI, the bookmarklet and the ESLint plugin report the same findings,
and none skips. The autofix removes the attribute from the form and adds nothing to the inputs:
which types each field accepts is the author's call. `accept` on `<input type="file">` never
matches.

## Resources

- [HTML Standard: non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): `accept` on `form` elements, "Use the accept attribute directly on the input elements instead."
- [HTML Standard: the `accept` attribute](https://html.spec.whatwg.org/multipage/input.html#attr-input-accept): defined for the file upload state, as a hint for the file picker.
- [HTML 4.01: the FORM element](https://www.w3.org/TR/html401/interact/forms.html#adef-accept): the form-level list of content types that user agents "may use" to filter files.
- [MDN: `accept`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept): the attribute on file inputs, its value syntax, and its earlier support on `form`.
