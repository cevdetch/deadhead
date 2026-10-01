---
ruleId: "meta/tdm-reservation-value"
title: "<meta name=\"tdm-reservation\"> other than 0 or 1"
description: "A tdm-reservation value other than 0 or 1 is a protocol error, and TDMRep agents then treat the reservation as unset."
pubDate: "2026-10-01"
status: "avoid"
severity: "harmful"
standardsBasis: "community"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="tdm-reservation" i]'
match: "logic"
fix: { op: "none" }
replacement: "Write 1 to reserve text and data mining rights, or 0 to waive the reservation: <meta name=\"tdm-reservation\" content=\"1\">."
tags: ["search"]
impacts: ["interop"]
related: ["meta/robots-value"]
---

A `<meta name="tdm-reservation">` whose value is not `0` or `1` reserves nothing. The TDM
Reservation Protocol (TDMRep) calls any other value a protocol error, and agents then treat the
reservation as unset: the page reads as if the author had said nothing.

## Why avoid

TDMRep defines `1` as "TDM rights are reserved" and `0` as not reserved, and states: "Other
values are considered protocol errors. In such a case the TDM Agents MUST consider that
`tdm-reservation` is `unset`." A page carrying `content="yes"` or `content="true"` makes no
reservation.

The reservation is what EU law turns on. Article 4(3) of Directive 2019/790 lets anyone with
lawful access mine content unless the rightholder has reserved that use "in an appropriate
manner, such as machine-readable means in the case of content made publicly available
online". A tag the protocol voids reserves nothing in a machine-readable way.

An agent reads `/.well-known/tdmrep.json`, then HTTP headers, then the meta tags, each later
source overriding the earlier. A voided meta tag leaves whatever the file or headers said in
force.

## Use instead

```html
<meta name="tdm-reservation" content="1">
<meta name="tdm-policy" content="https://example.com/tdm-policy.json">
```

`tdm-policy` is optional and points at a machine-readable policy. Write `0` to waive the
reservation.

## Detectability

Detectable with logic refining the selector. The module in
`packages/rules/logic/meta/tdm-reservation-value.ts` trims ASCII whitespace from `content` and
reports any value other than `0` or `1`. The spec says nothing on whitespace, so `" 1"` passes.
A tag with no `content` is reported: it carries no value. All three adapters read the same
attribute and agree.

No major model provider documents reading TDMRep. The harm falls on the agents that do, which
are the ones the author wrote the tag for.

## Resources

- [W3C TDMRep Community Group: TDM Reservation Protocol, Final Report (2024-05-10)](https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/): the `0` and `1` values, the protocol-error rule, and the processing order. "Not a W3C Standard nor is it on the W3C Standards Track."
- [Directive (EU) 2019/790, Article 4](https://eur-lex.europa.eu/eli/dir/2019/790/oj/eng): the text and data mining exception, unless rightholders have reserved it "such as machine-readable means".
