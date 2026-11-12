---
ruleId: "meta/http-equiv-pics-p3p"
title: "<meta http-equiv=\"pics-label\">, <meta http-equiv=\"p3p\">"
description: "PICS labels and P3P policies are retired vocabularies whose only consumer was Internet Explorer; the tags do nothing, so delete them."
pubDate: "2026-09-14"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="pics-label" i], meta[http-equiv="p3p" i]'
fix: { op: "remove-element" }
replacement: "Delete the tag. Publish a human-readable privacy policy instead; content descriptions belong in linked Description Resources, not markup."
tags: ["http-equiv"]
impacts: ["maintainability"]
related: ["meta/http-equiv-set-cookie"]
---

Two retired W3C vocabularies linger in `<meta>` tags. PICS labels rated content for IE's Content
Advisor; P3P policies declared privacy practices in machine-readable XML, gated in practice only
by IE's third-party-cookie handling. W3C obsoleted P3P in 2018 ("should no longer be used as a
basis for implementation") and superseded PICS with POWDER back in 2009.

Both tags carry their payload in `content`: a PICS label as a parenthesised rating string, and a
P3P `policyref` pointing at a policy file plus a compact policy, a string of three-letter tokens
such as `CP="NOI DSP COR NID"`.

## Why avoid

Both vocabularies are dead and their only reader is retired. W3C's obsolescence note states that
"no current (2018) user agents are known to provide interpretation of or implement decisions
based upon P3P policies". Its account of what went wrong is blunt: when Internet Explorer "was
updated to use the presence of a compact P3P policy as a broad gate" for third-party cookies,
"web site administrators chose to copy general policies rather than encode specific policies",
and "no enforcement action followed when a site's policy expressed in P3P failed to reflect
their actual privacy practices". The compact policies that survive in markup were copied to pass
a cookie check, not to describe anything.

Microsoft removed P3P support in Windows 10, with the advice "to avoid deploying P3P privacy
policies on your site". POWDER deliberately dropped PICS's one HTML-embedded capability:
"descriptions cannot be embedded directly in HTML", which "keeps both maintenance and
authentication of the description separate from maintenance of the described resources". With IE
gone, a `pics-label` or `p3p` tag is addressed to nobody.

A stale P3P string can also mislead. It reads as a privacy statement, while the site's real
practices are described somewhere else, or nowhere.

## Use instead

Delete the tags:

```html
<!-- Before -->
<meta http-equiv="pics-label" content="(PICS-1.1 &quot;http://example.com/labels&quot; l r (s 0))">
<meta http-equiv="p3p" content='policyref="/w3c/p3p.xml", CP="NOI DSP COR NID"'>

<!-- After: nothing -->
```

Delete the policy files they point to as well, such as `/w3c/p3p.xml`, and any `P3P` response
header the server still sends. Privacy practices belong in a privacy policy written for people.

## Detectability

Detectable with one selector: a two-branch selector is the whole rule, matched without regard to
ASCII case. The CLI, the bookmarklet and the ESLint plugin report the same findings, and none
skips. The fix always removes the element: no browser reads either value.

## Resources

- [W3C: P3P 1.0 obsoleted 30 August 2018](https://www.w3.org/TR/2018/OBSL-P3P-20180830/): obsolete, do not implement; no current user agent interprets P3P policies; copied compact policies and no enforcement.
- [W3C: PICS Superseded by POWDER (2009)](https://www.w3.org/2009/08/pics_superseded.html): no further PICS development; POWDER deliberately drops HTML-embedded labels.
- [Microsoft Learn: P3P is no longer supported (archived IE docs)](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/mt146424(v=vs.85)): P3P obsolete in Windows 10, support removed, "avoid deploying P3P privacy policies".
- [HTML Standard: Pragma directives](https://html.spec.whatwg.org/multipage/semantics.html#pragma-directives): neither `pics-label` nor `p3p` is a pragma keyword, so both map to no state.
