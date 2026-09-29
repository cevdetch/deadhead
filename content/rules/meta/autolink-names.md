---
ruleId: "meta/autolink-names"
title: "<meta name> autolink names"
description: "Opt-outs for IE6 Smart Tags, dropped before release in 2001, and Skype's click-to-call, which ignored its tag by 2010. Nothing reads them."
pubDate: "2026-09-29"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[name="MSSmartTagsPreventParsing" i], meta[name="SKYPE_TOOLBAR" i]'
fix: { op: "remove-element" }
replacement: "Delete it. Smart Tags never shipped in IE6, and Skype's toolbar stopped reading the tag by 2010; Skype itself closed in 2025."
tags: ["microsoft"]
impacts: ["maintainability"]
related: ["meta/msapplication-names", "meta/verification-names"]
---

Two `meta` names switched off client software that rewrote page text into links.
`MSSmartTagsPreventParsing` opted out of Smart Tags, which never shipped in Internet
Explorer 6. `SKYPE_TOOLBAR` opted out of the Skype toolbar's click-to-call buttons, which
stopped reading the tag by 2010. Neither name has a reader left.

## Why avoid

In the Windows XP and Internet Explorer 6 betas of June 2001, Smart Tags turned words on any
page into links to sites Microsoft chose. Microsoft's preview page told authors "you can
disable Smart Tag recognition in Internet Explorer within a Web page by adding a Meta tag":
`<meta name="MSSmartTagsPreventParsing" content="TRUE">`. On 2001-06-28 Microsoft pulled the
feature. IDG reported it "indefinitely postponed", quoting Microsoft's statement that it had
"realized that there is a need to better balance the user experience with the legitimate
concerns of content providers and web sites".

The Skype browser toolbar turned phone numbers, and in some locales any run of digits, into
call buttons. `<meta name="SKYPE_TOOLBAR" content="SKYPE_TOOLBAR_PARSER_COMPATIBLE">` asked
it to leave a page alone. By 2010 a Skype employee confirmed that "This meta tag is not
supported in the Current Version". Skype retired on 2025-05-05.

Google's Programmable Search Engine names `mssmarttagspreventparsing` among the tags it
"already recognizes" and "won't use ... for sorting, biasing, and filtering search results".
That keeps the tag out of its custom-attribute features and gives it no effect.

## Use instead

Delete both tags. Safari on iOS still links phone numbers on its own; keep Apple's switch if
a page needs it:

```html
<meta name="format-detection" content="telephone=no">
```

## Detectability

Detectable with a selector. The CLI, the bookmarklet and the ESLint plugin report the same
findings; none skips. The comma lists both names with `=` and the `i` flag, and any
`content` reports: `TRUE` and `SKYPE_TOOLBAR_PARSER_COMPATIBLE` were the documented values,
and no reader exists for any value. Apple's `format-detection` is live and stays quiet.

The autofix removes the element. No browser, extension or search engine acts on either name.

## Resources

- [Microsoft: Internet Explorer 6 Public Preview, Smart Tags (archived 2001-06-25)](https://web.archive.org/web/20010625111031/http://microsoft.com/windows/ie/preview/smarttags/default.asp): "you can disable Smart Tag recognition in Internet Explorer within a Web page by adding a Meta tag", with `MSSmartTagsPreventParsing` as the name.
- [IDG via CNN: Microsoft drops tagging feature (2001-06-29)](https://www.cnn.com/2001/TECH/ptech/06/29/ms.drops.tagging.idg/index.html): Smart Tags in Windows XP and Internet Explorer 6 "indefinitely postponed", with Microsoft's statement.
- [Wikimedia Phabricator T25749 (2010-06-01)](https://phabricator.wikimedia.org/T25749): Skype "had supported a meta tag at one point ... This meta tag is not supported in the Current Version, as confirmed by a Skype Employee".
- [Microsoft Support: Skype is retiring in May 2025](https://support.microsoft.com/en-us/skype/skype-is-retiring-in-may-2025-what-you-need-to-know-2a7d2501-427f-485e-8be0-2068a9f90472): "As of May 5th, 2025, Skype is retired".
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): `MSSmartTagsPreventParsing` and `skype_toolbar`, both listed as proposals.
- [Programmable Search Engine Help: Meta tags](https://support.google.com/programmable-search/answer/2595557): `mssmarttagspreventparsing` among the tags Google "won't use ... for sorting, biasing, and filtering search results".
