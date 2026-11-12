---
description: "Script attributes the browser ignores, JSON script blocks that fail whole, and the menus and data binding HTML dropped, with the rules for each."
---

The `<script>` element does more than it used to. With no `type` it runs classic
JavaScript; `type="module"` runs a module, and `importmap`, `speculationrules` and
`application/ld+json` make it a block of JSON the browser reads, or leaves for other
software, without running it. Each kind takes its own attributes, and an attribute on the
wrong kind is ignored without a warning.

The harmful cases are the ones where the page loses something. An import map or speculation
rules with `src` are skipped entirely, because HTML defines no external form for either, and
an import map that is not valid JSON maps nothing, so every bare `import` fails. A
`preload as="script"` for a module downloads the file twice. A JSON-LD value holding
`</script>` ends the block early. The unnecessary cases are attributes with no effect:
`async` or `defer` where they do nothing, `language`, the default `type`, and `nomodule` on a
fallback script no current browser runs.

Deadhead reports sixteen:

- [`attr/script-src`](/rules/attr/script-src),
  [`script/importmap-syntax`](/rules/script/importmap-syntax),
  [`link/preload-module`](/rules/link/preload-module) and
  [`script/json-ld-unescaped-lt`](/rules/script/json-ld-unescaped-lt): harmful.
- [`attr/script-async`](/rules/attr/script-async),
  [`attr/script-defer`](/rules/attr/script-defer),
  [`attr/script-language`](/rules/attr/script-language),
  [`attr/script-type-javascript`](/rules/attr/script-type-javascript),
  [`attr/script-nomodule`](/rules/attr/script-nomodule),
  [`attr/script-event-for`](/rules/attr/script-event-for) and
  [`attr/charset-obsolete`](/rules/attr/charset-obsolete): attributes on `<script>` that
  are obsolete or change nothing.
- [`element/menuitem`](/rules/element/menuitem),
  [`attr/menu-type-label`](/rules/attr/menu-type-label),
  [`attr/contextmenu-onshow`](/rules/attr/contextmenu-onshow),
  [`attr/dropzone`](/rules/attr/dropzone) and
  [`attr/data-binding`](/rules/attr/data-binding): declarative menus, drop targets and data
  binding that left HTML. Script replaces all of them.

MDN's [`<script>` reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
lists which attributes apply to which kind of script.
