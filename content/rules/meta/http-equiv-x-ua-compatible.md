---
ruleId: "meta/http-equiv-x-ua-compatible"
title: "<meta http-equiv=\"X-UA-Compatible\">"
description: "X-UA-Compatible controlled Internet Explorer document modes; Edge's IE mode and IE11 on Windows 10 LTSC/Server still honour it."
pubDate: "2026-09-09"
updatedDate: "2026-09-24"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="X-UA-Compatible" i]'
fix: { op: "none" }
replacement: "Check first that Edge's IE mode and IE11 on Windows 10 LTSC/Server never open this page. Delete it."
tags: ["http-equiv", "microsoft"]
impacts: ["maintainability"]
related: ["meta/http-equiv-ie-pragmas"]
---

Edge's IE mode still reads `X-UA-Compatible`, and IE11 on supported Windows 10 editions
reads it too. It was a Microsoft pragma, never a web
standard. Internet Explorer 8
shipped with several *document modes*: emulations of the layout and scripting quirks of
IE 5 through 8. It picked one per page using heuristics, a compatibility list shipped by
Microsoft, and this pragma. `IE=edge` was the escape hatch: it told IE to stop guessing
and use its newest engine. Every HTML boilerplate of the era copied it, and it has been
copied forward ever since.

## Why avoid

The pragma still has readers, on mainstream Windows included. The Internet Explorer 11
desktop application went out of support on Windows 10 Semi-Annual Channel and IoT on
15 June 2022, and Microsoft has since disabled it on certain versions of Windows 10; legacy (EdgeHTML) Edge went out of
support on 9 March 2021. Edge's IE mode ships in Edge on every supported Windows, runs the
Trident/MSHTML engine, is supported through at least 2029, and its Enterprise Mode Site
List schema defines a `compat-mode` value of `Default` as a mode in which "X-UA-compatible
meta tags or HTTP headers are honored". IE11 itself remains supported on Windows 10 LTSC
and Windows Server for the lifecycle of the Windows version it is installed on. IE11
displays intranet sites in Compatibility View by default, so on IE11 a doctype'd intranet
page without `IE=edge` renders in IE7 mode; deleting `IE=edge` drops that page from IE11
mode to IE7 mode there.

It is also not inert in review. Because it looks like configuration, it invites cargo
cult edits: `IE=edge,chrome=1` is still copied around, and the `chrome=1` half asked for
Google Chrome Frame, a plugin discontinued in 2014. A line nobody can explain but nobody
dares delete costs more over a decade than the bytes it occupies.

## Use instead

Delete it only if the site is not accessed through Edge's IE mode or IE11 on Windows 10
LTSC or Windows Server. For those readers, `IE=edge` selects the newest supported
document mode; deleting it can drop an IE11 intranet page with no explicit mode override
into a legacy mode instead.

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
```

If you are serving the pragma as an HTTP response header rather than a `<meta>` tag, the
same reader population applies there too.

## Detectability

Fully detectable. The rule matches outright: the pragma is a single element identified
by one attribute value, with
no context that changes the verdict. There is no autofix. Deleting `IE=edge` from an
intranet page an enterprise still opens in IE11 on Windows 10 LTSC/Server can drop that
page from its newest supported mode to IE7 mode. Deleting an explicit legacy value
(`IE=8`, `IE=EmulateIE7`) changes the document mode wherever IE mode or IE11 honours
the pragma. A person has to know whether that population reads the page before removing
the tag.

## Resources

- [HTML Standard: pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv): the normative list of `http-equiv` values; `X-UA-Compatible` is not among them.
- [Internet Explorer 11 end of support](https://learn.microsoft.com/en-us/lifecycle/announcements/internet-explorer-11-end-of-support): Microsoft, retired 15 June 2022.
- [Specifying legacy document modes](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/jj676915(v=vs.85)): Microsoft's own documentation for what the pragma did.
- [Microsoft Learn: IE mode in Microsoft Edge](https://learn.microsoft.com/en-us/deployedge/edge-ie-mode): IE mode runs the Trident/MSHTML engine and is supported "through at least 2029".
- [Microsoft Lifecycle FAQ: Internet Explorer and Microsoft Edge](https://learn.microsoft.com/en-us/lifecycle/faq/internet-explorer-microsoft-edge): IE11 stays supported on Windows 10 LTSC and Windows Server for the lifecycle of the host Windows version, and is out of support on Windows 10 SAC and IoT.
- [Microsoft Learn: fix compatibility issues with document modes (IE11 for IT Pros), archived](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-it-pro/internet-explorer-11/ie11-deploy-guide/fix-compat-issues-with-doc-modes-and-enterprise-mode-site-list): "By default, IE11 uses the Display intranet sites in Compatibility View setting", the behaviour the page reproduces with IE7 document mode.
- [Microsoft Learn: Enterprise Mode schema version 2 guidance](https://learn.microsoft.com/en-us/internet-explorer/ie11-deploy-guide/enterprise-mode-schema-version-2-guidance): `compat-mode` Default "X-UA-compatible meta tags or HTTP headers are honored".
