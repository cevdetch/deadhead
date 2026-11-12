---
ruleId: "attr/object-plugin"
title: "<object> plugin attributes"
description: "seven plugin-era attributes on object are obsolete; data and type invoke resources now."
pubDate: "2026-09-19"
status: "avoid"
severity: "deprecated"
standardsBasis: "spec-obsolete"
detectability: "yes"
kind: "element"
scope: "body"
selector: "object[archive], object[code], object[codebase], object[codetype], object[declare], object[standby], object[typemustmatch]"
fix: { op: "remove-attributes" }
replacement: "Delete the attributes. Invoke resources with data and type: <object data=\"clip.mp4\" type=\"video/mp4\">."
tags: ["embedding"]
impacts: ["maintainability"]
related: ["element/object-embed-plugin"]
---

Seven plugin-era attributes on `object` invoke nothing: `archive`, `code`, `codebase`,
`codetype`, `declare`, `standby` and `typemustmatch`. They configured Java applets and ActiveX
controls, and the HTML Standard lists each as obsolete with a replacement, `data` and `type` for
invocation and plain markup for the rest.

Each had a job in the plugin model. `code` named a Java class to start, as on `<applet>`;
`codebase` gave the base URL for the code; `archive` listed archive files to fetch with it;
`codetype` named the type of that code; `declare` defined an object without starting it, for
later reuse; `standby` held a message to show while the plug-in loaded; and `typemustmatch`
refused a resource whose served type differed from `type`.

## Why avoid

The HTML Standard sends the invocation attributes `archive`, `code`, `codebase` and `codetype`
to one line: "Use the data and type attributes to invoke plugins." For the others it says:
`declare`, "Repeat the object element completely each time the resource is to be reused";
`standby`, "Optimize the linked resource so that it loads quickly or, at least, incrementally";
`typemustmatch`, "Avoid using object elements with untrusted resources." It gives `classid` the
same direction as the invocation group, but `element/object-embed-plugin` owns that attribute,
since removing it changes how `object` chooses its fallback.

The plug-ins these attributes configured are gone. Chrome announced in 2013 that it would phase
out NPAPI, the interface Java and other plug-ins used, and Adobe ended Flash Player after
2020-12-31 and blocked Flash content from 2021-01-12. An `object` still renders images, nested
documents and PDFs through `data` and `type`, and none of the seven takes part.

Some still reach scripts. The standard keeps reflected `archive`, `code`, `declare`, `standby`,
`codeBase` and `codeType` properties on `HTMLObjectElement`, so a script that reads them gets
the attribute values; no fetch or rendering step reads them. `typemustmatch` has no property
left at all.

## Use instead

Invoke the resource with `data` and `type`, give fallback content inside, and write the element
out again wherever it is reused:

```html
<!-- Before -->
<object data="clip.mp4" type="video/mp4" width="640" height="360" archive="clips.zip" standby="Loading">
  <a href="clip.mp4">Download the clip (MP4)</a>
</object>

<!-- After -->
<object data="clip.mp4" type="video/mp4" width="640" height="360">
  <a href="clip.mp4">Download the clip (MP4)</a>
</object>
```

For media, `<video>` and `<audio>` do more than `<object>`: controls, captions and several
sources. A loading message belongs in the page, shown and hidden by script, or replaced by a
resource that loads incrementally. Content from an untrusted source belongs in a sandboxed
`<iframe>`, not an `<object>` with `typemustmatch`.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. The rule matches any of the seven spellings: presence of any one
is the whole verdict, so no logic module exists. The autofix removes every attribute the rule
names that is present on the element, and leaves every other attribute as written; with no
plug-in to read them, the object renders the same. `classid` is left to
`element/object-embed-plugin`: removing it changes how `<object>` chooses its fallback.

## Resources

- [HTML Standard: Non-conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features): all seven attributes obsolete, with "Use the data and type attributes to invoke plugins" for the invocation group.
- [HTML Standard: Other elements, attributes and APIs](https://html.spec.whatwg.org/multipage/obsolete.html#other-elements,-attributes-and-apis): the reflected `HTMLObjectElement` members that remain, with no `typeMustMatch`.
- [MDN: `<object>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/object): at least one of `data` and `type` must be defined.
- [Chromium Blog: Saying goodbye to our old friend NPAPI (2013)](https://blog.chromium.org/2013/09/saying-goodbye-to-our-old-friend-npapi.html): "Chrome will be phasing out NPAPI support over the coming year."
- [Adobe: Flash Player end of life](https://www.adobe.com/products/flashplayer/end-of-life-alternative.html): support ended 2020-12-31, and Flash content blocked from 2021-01-12.
