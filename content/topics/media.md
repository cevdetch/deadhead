---
description: "Images, image maps, sound and SVG links in their pre-HTML5 spellings: what browsers still read, and the seven rules that report the rest."
---

Media markup grew in layers. Images were placed with `align`, `hspace` and `border`; image
maps carried attributes from early drafts; Internet Explorer played background music with
`<bgsound>`; and SVG linked with XLink's `xlink:href`. The replacements are CSS for
placement, `<img usemap>` with `<area>` for maps, `<audio controls>` for sound, and the plain
`href` that SVG 2 adopted.

Not all of the old forms are inert, which is why several rules here have no autofix.
Browsers still apply presentational attributes on `<img>`, `<object>` and `<embed>` until
CSS overrides them. Firefox still exposes `longdesc` on an image to screen readers, so
deleting it can remove a description someone uses. And `<bgsound>` now plays nothing at all,
so a page that depends on it is silent.

Deadhead reports seven, all deprecated:

- [`attr/media-presentational`](/rules/attr/media-presentational): layout written as
  attributes on images, objects and embeds.
- [`attr/longdesc-lowsrc`](/rules/attr/longdesc-lowsrc): `longdesc` and `lowsrc`. Link to a
  long description with an ordinary link, and serve a progressive image instead of a
  low-resolution stand-in.
- [`attr/area-hreflang-type-nohref`](/rules/attr/area-hreflang-type-nohref),
  [`attr/object-usemap`](/rules/attr/object-usemap) and
  [`attr/input-ismap-usemap`](/rules/attr/input-ismap-usemap): image-map attributes in places
  no engine reads them. The fix deletes them.
- [`attr/svg-xlink`](/rules/attr/svg-xlink): `xlink:` attributes on inline SVG. Write
  `href`, and a child `<title>` for the link's title.
- [`element/bgsound`](/rules/element/bgsound): use
  [`<audio>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio)
  with controls, so visitors can stop it.

The [SVG](/topics/svg) and [embedded content](/topics/embedding) topics cover the rest of
inline graphics and plugins.
