---
description: "Plug-ins, frames and embeds that iframe, video and audio outlived, and the Privacy Sandbox attributes Chrome is removing."
---

For years, embedding meant plug-ins. `<applet>` ran Java, and `<object>` and `<embed>`
started Flash or Silverlight, configured with `<param>` children and a `<noembed>` fallback.
Framesets split the window into separate documents. Browsers no longer run plug-ins, so that
markup now renders blank or falls back, and HTML replaced it with `<iframe>`, `<video>`,
`<audio>` and plain markup.

A newer group is on its way out. Google retired the Topics and Attribution Reporting APIs
from its Privacy Sandbox, and Chrome is removing them along with `<fencedframe>`. The
attributes and `allow` directives that opted frames and requests into them will grant
nothing once the APIs are gone. Separately, `allowpaymentrequest` on `<iframe>` was removed
from HTML in 2020 in favour of `allow="payment"`, but Chrome still reads the old spelling and
grants payment to every origin with it.

Deadhead reports twelve, all deprecated:

- [`element/object-embed-plugin`](/rules/element/object-embed-plugin),
  [`element/applet`](/rules/element/applet), [`element/param`](/rules/element/param),
  [`element/noembed`](/rules/element/noembed) and
  [`attr/object-plugin`](/rules/attr/object-plugin): plug-in markup. Keep the fallback
  inside `<object>` or `<applet>`, which is what visitors see now; `<noembed>` content is
  never shown.
- [`element/frameset`](/rules/element/frameset): one document with `<iframe>` where a pane
  is really needed.
- [`attr/iframe-allowpaymentrequest`](/rules/attr/iframe-allowpaymentrequest): write
  `allow="payment"` instead.
- [`element/fencedframe`](/rules/element/fencedframe),
  [`attr/browsingtopics-attributionsrc`](/rules/attr/browsingtopics-attributionsrc) and
  [`attr/iframe-allow-privacy-sandbox`](/rules/attr/iframe-allow-privacy-sandbox): the
  Privacy Sandbox features.
- [`attr/iframe-presentational`](/rules/attr/iframe-presentational) and
  [`attr/object-usemap`](/rules/attr/object-usemap): styling and image maps in the wrong
  place.

MDN's [`<iframe>` reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
covers the `allow` attribute and permissions policy.
