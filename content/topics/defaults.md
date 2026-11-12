---
description: "Attributes and pragmas that restate what browsers already assume: type on script and style, and the HTML 4.01 default-language tags."
---

HTML 4.01 had no default scripting or style language. A page could be written in
JavaScript, JScript, VBScript or Tcl, so `type` was required on `<script>` and `<style>`,
and a page could declare its defaults once with `<meta http-equiv="Content-Script-Type">`
and `Content-Style-Type`. HTML5 settled the question: a `<script>` with no `type` is a
classic JavaScript script, and `<style>` holds CSS. The labels kept being written, by
templates and boilerplates, long after they stopped choosing anything.

They cost a few bytes. They are reported because a page that restates its defaults teaches
the next author that the labels matter, and on `<script>` the attribute now does select
behaviour: `module`, `importmap` and `speculationrules` change what the element is. Treating
`type` as boilerplate is how a `type="module"` gets deleted in a clean-up. In the
[10,000 home pages](/blog/what-10000-home-pages-put-in-their-head) deadhead linted,
`type="text/javascript"` was the most common finding of all.

Deadhead reports three defaults, all unnecessary and all fixed by deleting them:

- [`attr/script-type-javascript`](/rules/attr/script-type-javascript): a JavaScript MIME
  type such as `text/javascript` in `type`. The
  [HTML Standard](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-type)
  tells authors to omit it.
- [`attr/style-type`](/rules/attr/style-type): `type="text/css"` on `<style>`.
- [`meta/http-equiv-content-script-style-type`](/rules/meta/http-equiv-content-script-style-type):
  the two HTML 4.01 pragmas, which have no entry in today's pragma table.

The first two leave a value alone when deleting it would change behaviour. A
`text/javascript; charset=utf-8` or a misspelt `text/javasript` makes the element a data
block that never runs, and removing the attribute would start running it. That needs a
person, not a fix.
