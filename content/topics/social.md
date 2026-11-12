---
description: "Open Graph and card tags for link previews: what preview crawlers read, and the mistakes that leave a shared link without its title or image."
---

When someone shares a link, the site it is shared on fetches the page and builds a preview
card from its head: a title, a description, an image and the URL. Most of them read the
[Open Graph protocol](https://ogp.me/), `og:title`, `og:description`, `og:image` and
`og:url` written as `<meta property>`. X adds `twitter:card` to choose the card's layout,
and falls back to Open Graph for the rest.

Preview crawlers are strict where browsers are forgiving. They read the HTML on their own
servers, so a relative `og:image` such as `/images/cover.jpg` resolves against nothing and
the card loses its picture. They read `property`, so an Open Graph name in `name` is
invisible to them. And a page with Open Graph tags but no `og:image` shares as a card
without one, since nothing else on the page stands in for the image.

Deadhead reports eight:

- [`meta/og-relative-url`](/rules/meta/og-relative-url): a relative URL in an Open Graph
  property. Harmful: write absolute `https://` URLs.
- [`meta/og-required-properties`](/rules/meta/og-required-properties) and
  [`meta/og-name-attribute`](/rules/meta/og-name-attribute): no `og:image`, and Open Graph
  written in `name`.
- [`meta/twitter-card-names`](/rules/meta/twitter-card-names): `twitter:title`,
  `twitter:description` and `twitter:image` that repeat the Open Graph values. Keep
  `twitter:card` and the account tags; the copies drift apart.
- [`meta/og-contact-properties`](/rules/meta/og-contact-properties),
  [`meta/og-fb-pages`](/rules/meta/og-fb-pages) and
  [`link/image-src`](/rules/link/image-src): properties and a link relation nothing reads any
  more.
- [`attr/xmlns-prefix`](/rules/attr/xmlns-prefix): `xmlns:og` on `<html>`, an XHTML-era
  namespace declaration the HTML parser never read. Use `prefix` if the page needs RDFa
  prefixes at all.

Twitter card copies were the second most common finding in the
[10,000 home pages](/blog/what-10000-home-pages-put-in-their-head) deadhead linted.
