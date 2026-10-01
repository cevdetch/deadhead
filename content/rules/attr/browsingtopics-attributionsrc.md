---
ruleId: "attr/browsingtopics-attributionsrc"
title: "<browsingtopics> and <attributionsrc> attributes"
description: "browsingtopics and attributionsrc feed APIs Chrome is removing; once they go, the attributes do nothing."
pubDate: "2026-09-25"
status: "avoid"
severity: "deprecated"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "any"
selector: "iframe[browsingtopics], img[browsingtopics], a[attributionsrc], area[attributionsrc], img[attributionsrc], script[attributionsrc]"
fix: { op: "none" }
replacement: "Delete the attribute: <img src=\"/banner.png\" alt=\"Autumn sale\">."
tags: ["embedding"]
impacts: ["maintainability"]
related: ["attr/iframe-allow-privacy-sandbox"]
---

Two attributes opt requests into Privacy Sandbox measurement. `browsingtopics`
on `iframe` and `img` sends the selected topics with the request for the
source. `attributionsrc` on `a`, `area`, `img` and `script` marks the request
eligible for attribution. Google retired the Topics API and the Attribution
Reporting API, and Chrome is removing both, so each attribute feeds an API on
its way out.

## Why avoid

Google ended both APIs on 2025-10-17, retiring Topics and Attribution Reporting in Chrome
and Android. The Topics spec repo carries a deprecation banner and sits archived since
2025-11-12. Chrome is removing Topics through a field trial: it reached 1% of Stable on M153
by 2026-09-24, and its owner asked to go to 10% and then 100%. The Chrome 153 notes call
Attribution Reporting "planned for deprecation and removal", and both ChromeStatus entries
read "Proposed". No other engine ships either API: Mozilla holds a negative position on
Topics, and neither entry shows a Safari signal.

Once the removal lands, the attributes change nothing: no topics travel with
the request, and no attribution source registers from it.

## Use instead

Delete the attribute and keep the element:

```html
<img src="/banner.png" alt="Autumn sale">
```

Neither API has a successor in Chrome, which keeps third-party cookies.

## Detectability

Detectable with the selector alone. The comma lists every spelling:
`browsingtopics` on `iframe` and `img`; `attributionsrc` on `a`, `area`, `img`
and `script`. Anything unlisted stays quiet by construction. The CLI, the
bookmarklet and the ESLint plugin all report; none skips.

There is no autofix. The attributes still act in Chrome until the removal
ships, so deleting one today would drop live measurement; after that, one op
takes one attribute name while the rule covers two, which keeps `none` the
honest fix.

## Resources

- [Privacy Sandbox: Update on Plans for Privacy Sandbox Technologies (2025-10-17)](https://privacysandbox.com/news/update-on-plans-for-privacy-sandbox-technologies/): Google retires Topics and Attribution Reporting in Chrome and Android, through their usual processes.
- [patcg-individual-drafts/topics (archived 2025-11-12)](https://github.com/patcg-individual-drafts/topics): banner states the Topics API is deprecated and planned for removal from Chrome; documents `browsingtopics` on `iframe` and `img` sending topics with the request.
- [ChromeStatus: Deprecate and remove Topics API](https://chromestatus.com/feature/5135370673061888): status "Proposed", milestone 153 on desktop and Android.
- [ChromeStatus: Deprecate and remove Attribution Reporting API](https://chromestatus.com/feature/6320639375966208): status "Proposed", milestone 153 on desktop and Android.
- [Chrome 153 release notes](https://developer.chrome.com/release-notes/153): Attribution Reporting "is planned for deprecation and removal".
- [blink-dev: Intent to Deprecate and Remove Topics API](https://groups.google.com/a/chromium.org/g/blink-dev/c/_R85yctz4Rs): the removal field trial, at 1% of Stable on M153+ by 2026-09-24.
- [WICG: Attribution Reporting §2.1](https://wicg.github.io/attribution-reporting-api/#html-monkeypatches): `attributionsrc` content attributes on `a`, `area`, `img` and `script` mark requests eligible for attribution.
- [Mozilla Standards Positions #622](https://github.com/mozilla/standards-positions/issues/622): Mozilla holds a negative position on the Topics API.
