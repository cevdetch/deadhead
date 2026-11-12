---
description: "Markup browsers disagree on, or none act on: quirks-mode doctypes, values HTML skips, late or duplicate declarations, and removed features."
---

Interoperability is about whether a page works the same in every browser, and whether the
markup does what its author expects in any of them. The rules here report three kinds of
failure.

The first is markup that changes how a page is parsed or rendered. A missing or legacy
doctype puts the page in quirks mode. An encoding declaration past the first 1,024 bytes is
never seen, a second one is ignored, and a label other than UTF-8 decodes the bytes by a
legacy table. A `<base>` placed after URLs it should resolve sends them to the wrong place,
and a second `<base>` is ignored. A missing viewport lays the page out at desktop width on
a phone.

The second is values the HTML Standard tells browsers to skip when they do not parse: a
`theme-color` that is not a CSS colour, a `color-scheme` outside its grammar, viewport keys
no browser knows, an import map that is not valid JSON. Nothing reports the failure in the
page; the setting just does not apply.

The third is features that only some engines shipped, or that every engine removed: Shadow
DOM v0's `<content>` and `<shadow>`, `<menuitem>`, `<keygen>`, Java applets and plug-ins,
`<fencedframe>`, `<rtc>` ruby annotations that Chromium and WebKit misplace. A page that
still depends on one works in no browser, or in one.

Many of these rules are harmful, and few have an autofix: a fix that changed the rendering
mode, the encoding or a value would change behaviour, which deadhead's fixes never do. The
[doctype](/topics/doctype), [character encoding](/topics/charset),
[theming](/topics/theming) and [Web Components](/topics/web-components) topics explain the
largest groups.
