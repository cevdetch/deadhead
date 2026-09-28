---
ruleId: "meta/csp-block-all-mixed-content"
title: "<meta http-equiv> CSP block-all-mixed-content"
description: "block-all-mixed-content is obsolete; browsers autoupgrade by default, so strip the directive and list upgrade-insecure-requests."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[http-equiv="content-security-policy" i]'
match: "logic"
fix: { op: "none" }
replacement: "Drop the block-all-mixed-content directive from the meta content. List upgrade-insecure-requests in its place; it runs in meta and in headers."
tags: ["csp", "http-equiv"]
impacts: ["security", "maintainability"]
related: ["meta/csp-report-uri", "meta/http-equiv-content-security-policy"]
---

`block-all-mixed-content` in a meta CSP policy changes nothing. Mixed Content labels the directive obsolete in favor of default autoupgrade plus `upgrade-insecure-requests`, and browsers upgrade without it, so the markup claims work the browser never needs.

## Why avoid

Mixed Content retires the directive in one line. Section 6.1 states an earlier version of the spec defined `block-all-mixed-content` and it is now obsolete, because all mixed content is now blocked where it cannot be autoupgraded. The same note keeps the replacement alive: `upgrade-insecure-requests` is not obsolete because it upgrades blockable content the default pass leaves alone.

MDN badges the page Deprecated and repeats the warning: the directive is marked as obsolete in the specification, it once stopped `optionally-blockable` mixed content, and content that is not blocked is now always upgraded, so the directive is not needed. MDN adds the ordering rule: `upgrade-insecure-requests` is evaluated before `block-all-mixed-content`, so where the former is set the latter does nothing.

The loss is silent. A policy that lists the retired directive alone leans on dead text, and a policy that lists both carries a token the browser skips. Either way the author trusts a keyword with no reader while default autoupgrade plus block does the work.

## Use instead

List the live directive in the same meta tag:

```html
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

MDN documents the same shape with a meta example: insecure requests are rewritten before they hit the network, first-party as well as third-party. Where the resource is missing over HTTPS the request fails with no HTTP fallback, which preserves the security of the page.

## Detectability

Complete detection. The rule pre-filters with `meta[http-equiv="content-security-policy" i]`: the verdict depends on whether one `;` part of `content` names `block-all-mixed-content` as its directive, compared ASCII case-insensitive. The decision therefore lives in `packages/rules/logic/meta/csp-block-all-mixed-content.ts`. An `upgrade-insecure-requests` directive in isolation never trips the rule, and a URL path that holds the string leaves the rule silent: the test reads directive names, not substrings. Sibling `meta/http-equiv-content-security-policy` flags each meta CSP as harmful; this rule names the obsolete directive inside it, so a tag with `block-all-mixed-content` trips both.

There is no autofix. The fault sits in one `;` part of `content`, which no fix op edits: `remove-token` splits on whitespace and would corrupt the `;` list. Deleting the tag would drop live fetch directives such as `default-src` next to the dead one. Edit the `;` part by hand.

## Resources

- [W3C Mixed Content: Obsolescences](https://www.w3.org/TR/mixed-content/#obsolescences): an earlier version defined the `block-all-mixed-content` CSP directive and it is now obsolete, because all mixed content is now blocked where it cannot be autoupgraded.
- [MDN: Content-Security-Policy block-all-mixed-content](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/block-all-mixed-content): badges the directive Deprecated, warns it is marked as obsolete in the specification, and notes `upgrade-insecure-requests` is evaluated first so the retired directive does nothing beside it.
- [MDN: Content-Security-Policy upgrade-insecure-requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests): treats insecure URLs as replaced with secure ones, carries a meta element example, and rates Baseline Widely available.
- [Upgrade Insecure Requests: delivery](https://w3c.github.io/webappsec-upgrade-insecure-requests/#delivery): the normative spec behind the replacement, linked from the MDN Specifications table.
