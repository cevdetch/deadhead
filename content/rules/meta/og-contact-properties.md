---
ruleId: "meta/og-contact-properties"
title: "<meta property> contact properties"
description: "Eleven contact properties absent from the protocol; no parser reads them."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "vendor"
detectability: "yes"
kind: "element"
scope: "head"
selector: 'meta[property="og:email" i], meta[property="og:phone_number" i], meta[property="og:fax_number" i], meta[property="og:latitude" i], meta[property="og:longitude" i], meta[property="og:street-address" i], meta[property="og:locality" i], meta[property="og:region" i], meta[property="og:postal-code" i], meta[property="og:country-name" i], meta[property="fb:page_id" i]'
fix: { op: "remove-element" }
replacement: "Delete the tag."
tags: ["social"]
impacts: ["seo"]
related: ["meta/og-name-attribute"]
---

A `property` from the Open Graph contact set feeds no parser. Eleven such properties trip this
rule; live properties stay quiet.

The first Open Graph protocol, published by Facebook in 2010, had sections for "Specifying
location" and "Specifying contact information". Ten properties came from there, named after the
hCard microformat: `og:latitude`, `og:longitude`, `og:street-address`, `og:locality`,
`og:region`, `og:postal-code`, `og:country-name`, `og:email`, `og:phone_number` and
`og:fax_number`. The eleventh, `fb:page_id`, is a Facebook property that the protocol never
listed. Later revisions of the protocol dropped all of them, and boilerplate copied from
2010-era guides still carries them.

## Why avoid

The current protocol at ogp.me omits all eleven. Each was checked against its text with zero
hits: no email, no phone numbers, no coordinates, no address parts, no page id. The protocol now
covers the object's identity (`og:title`, `og:type`, `og:image`, `og:url`), optional metadata
such as `og:description` and `og:locale`, and type-specific vocabularies such as `article:*`.

The WHATWG wiki lists `fb:page_id` as an "Incomplete proposal", noting that the Open Graph spec
"specifies this to be a value of the property attribute--not a meta keyword". The geo and
contact generation left with the old protocol text.

A retired property feeds no parser, so contact and location details written this way reach
nobody. Link previews build on the title, description and image. Authors who believe the address
travels with them skip the alternatives that work.

Dead properties also cost bytes and review time, and a stale phone number or address in the head
outlives the one on the page.

## Use instead

Delete the tags. There is no protocol successor for these fields. Publish location and contact
details as page content that people can read, and describe them for machines with structured
data:

```html
<!-- Before -->
<meta property="og:latitude" content="47.0667">
<meta property="og:phone_number" content="+41-31-555-0100">

<!-- After: visible content, plus schema.org data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Rose Garden Shop",
  "telephone": "+41-31-555-0100",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rosenweg 1",
    "addressLocality": "Bern",
    "postalCode": "3000",
    "addressCountry": "CH"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 46.948, "longitude": 7.447 }
}
</script>
```

Google documents `LocalBusiness` structured data for business details. Keep `og:title`,
`og:description`, `og:image` and `og:url` for link previews.

## Detectability

Detectable with the selector alone. The CLI, the bookmarklet and the ESLint plugin report the
same findings, and none skips. Each branch pins one property value with `=`, and the `i` flag
folds case. Anything unlisted stays quiet by construction, so live properties such as `og:title`
never trip it. The fix removes the element: no parser reads it, so no preview or result changes.

## Resources

- [ogp.me: the Open Graph protocol](https://ogp.me/): the current property list, checked name by name with zero hits for all eleven.
- [The Open Graph protocol, 2010 text (archived)](https://web.archive.org/web/2010/http://opengraphprotocol.org/): "Specifying location" and "Specifying contact information", with the property names "defined within the Microformat hCard".
- [WHATWG Wiki: MetaExtensions](https://wiki.whatwg.org/wiki/MetaExtensions): `fb:page_id` as an "Incomplete proposal" and a value of the `property` attribute.
- [Google Search Central: local business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business): `LocalBusiness` with `address`, `telephone` and `geo` properties.
