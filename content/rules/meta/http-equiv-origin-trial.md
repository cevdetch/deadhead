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

A `<meta http-equiv="origin-trial">` whose token has expired enrolls the page in nothing. Chrome
ignores the token, so the tag is dead weight from the day the trial ends. The token carries its
own expiry, so the markup says when.

## Why avoid

Chrome's origin trials guide: "Chrome ignores invalid or expired tokens", and "When your token
expires, you will get an email with a renewal link." Chromium reads `expiry` from the token's
payload and rejects it once that time has passed.

The finding appears on the expiry date with no change to the page. A CI run that turns red the
morning after a trial ends is the rule working.

## Use instead

Delete the tag, or renew the trial and replace the token:

```html
<meta http-equiv="origin-trial" content="NEW_TOKEN">
```

## Detectability

The logic in `packages/rules/logic/meta/http-equiv-origin-trial.ts` decodes each token in
Chromium's layout and reports the tag when every token has expired, naming the feature and the
date. A live token keeps the tag quiet, since Chrome uses the first valid one. So does a token
it cannot decode: Firefox enrolls from the same tag with tokens of its own. The fix deletes the
tag, which Chrome already ignores.

## Resources

- [Chrome for Developers: origin trials](https://developer.chrome.com/docs/web-platform/origin-trials/): the meta tag, and "Chrome ignores invalid or expired tokens".
- [Chromium: trial_token.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/common/origin_trials/trial_token.cc): the token layout, the `expiry` field and the expired status.
