---
description: "Internet Explorer, Windows and Live Writer hooks left in HTML: document modes, data binding, script events, tiles and the seven rules for them."
---

Internet Explorer had its own extensions to HTML, and many templates were written when IE
was the browser to support. Document modes picked which version of IE's engine rendered a
page; data binding filled tables from recordsets; `<script event for>` attached a script to
an element's event; pragmas switched off the image toolbar and played page transitions; and
pinned-site metadata fed Windows taskbar and Start-screen tiles. Windows Live Writer and
Skype's toolbar added their own hooks on top.

Microsoft ended support for the Internet Explorer 11 desktop application in June 2022, and
Edge, built on Chromium, reads none of this. The one exception is IE mode in Edge, which
some organisations run for internal sites, and IE11 on a few long-term Windows editions:
both still honour `X-UA-Compatible`. Microsoft's
[lifecycle FAQ](https://learn.microsoft.com/en-us/lifecycle/faq/internet-explorer-microsoft-edge)
has the dates.

Deadhead reports seven:

- [`meta/http-equiv-x-ua-compatible`](/rules/meta/http-equiv-x-ua-compatible): the document
  mode switch. Unnecessary, with no autofix, because a site served in IE mode may still
  depend on it.
- [`meta/http-equiv-ie-pragmas`](/rules/meta/http-equiv-ie-pragmas),
  [`meta/msapplication-names`](/rules/meta/msapplication-names) and
  [`meta/autolink-names`](/rules/meta/autolink-names): IE pragmas, tile metadata and opt-outs
  for Smart Tags and Skype click-to-call. Nothing reads them, and the fix deletes them.
- [`link/wlwmanifest`](/rules/link/wlwmanifest): the Windows Live Writer manifest link,
  which WordPress stopped writing in 6.3.
- [`attr/data-binding`](/rules/attr/data-binding) and
  [`attr/script-event-for`](/rules/attr/script-event-for): IE's data binding and script event
  attributes, both obsolete. Populate the page with script and attach listeners with
  `addEventListener`.

`X-UA-Compatible` was among the five most common findings in the
[10,000 home pages](/blog/what-10000-home-pages-put-in-their-head) deadhead linted.
