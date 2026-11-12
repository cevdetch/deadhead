---
ruleId: "meta/http-equiv-origin-trial"
title: "<meta http-equiv=\"origin-trial\"> with an expired token"
description: "An origin-trial token past its expiry enrolls nothing: Chrome ignores it, and the tag is dead weight in the head."
pubDate: "2026-10-01"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "document"
scope: "head"
match: "logic"
fix: { op: "remove-element" }
replacement: "Delete the tag. To keep testing the feature, renew the trial and paste the new token."
tags: ["http-equiv"]
impacts: ["maintainability"]
related: ["meta/http-equiv-unregistered-pragmas"]
---

A `<meta http-equiv="origin-trial">` whose token has expired enrols the page in nothing. Chrome
ignores the token, so the tag is dead weight from the day the trial ends. The token carries its
own expiry, so the markup says when.

An origin trial lets a site use an experimental or deprecated browser feature for a limited
time. The site registers its origin, receives a signed token, and serves it in a
`<meta http-equiv="origin-trial">` tag or an `Origin-Trial` response header. Each token names
one feature, one origin and an expiry date. There are two kinds: trials of new features before
they ship, and deprecation trials that keep a removed feature working for a while longer.

## Why avoid

Chrome's origin trials guide: "Chrome ignores invalid or expired tokens", and "When your token
expires, you will get an email with a renewal link." Chromium reads `expiry` from the token's
payload and rejects it once that time has passed.

The finding appears on the expiry date with no change to the page. A CI run that turns red the
morning after a trial ends is the rule working.

The tag is a pointer to something that needs a decision. For a feature trial, the feature either
shipped, in which case the page works without the token, or did not, in which case the code
behind it no longer runs and needs a fallback. For a deprecation trial, the removed feature
stopped working on the expiry date for every visitor on a current Chrome, and the code that
relied on it is broken now. In both cases the expired token in the head is the last trace of a
dependency someone meant to revisit.

## Use instead

Delete the tag, or renew the trial and replace the token:

```html
<!-- Before: the token's expiry has passed -->
<meta http-equiv="origin-trial" content="AwAAAA…">

<!-- After: deleted, or a fresh token from the trial's console -->
<meta http-equiv="origin-trial" content="NEW_TOKEN">
```

Check what the trial was for before choosing. If the feature has shipped, delete the tag. If the
trial was extended, register again and paste the new token. If the trial ended without the
feature shipping, or a deprecation trial is over, remove the code that depends on it along with
the tag. A token sent in an `Origin-Trial` header needs the same review; it is outside the
markup and outside this rule.

Tokens for third-party scripts are injected by the script into `document.head` and do not appear
in the served HTML. A page can carry several tokens, for several features or origins; Chrome
uses the first valid token for a trial and ignores the rest.

## Detectability

The logic in `packages/rules/logic/meta/http-equiv-origin-trial.ts` decodes each token in
Chromium's layout and reports the tag when every token has expired, naming the feature and the
date. The CLI, the bookmarklet and the ESLint plugin report the same findings, and none skips. A
live token keeps the tag quiet. So does a token it cannot decode: Firefox enrols from the same
tag with tokens of its own. The verdict reads the clock, so the same page goes from clean to
reported on the expiry date. The fix deletes the tag, which Chrome already ignores.

## Resources

- [Chrome for Developers: origin trials](https://developer.chrome.com/docs/web-platform/origin-trials/): the meta tag and the `Origin-Trial` header, script-injected third-party tokens, "Chrome ignores invalid or expired tokens", "The origin trials framework looks for the first valid token and then ignores all other tokens", and deprecation trials.
- [Chromium: trial_token.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/common/origin_trials/trial_token.cc): the token layout, the `expiry` field and the expired status.
- [Firefox Origin Trials](https://wiki.mozilla.org/Origin_Trials): Firefox's own trials, enrolled with the same `<meta http-equiv="origin-trial">` tag and header.
