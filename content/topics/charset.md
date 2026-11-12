---
description: "How a browser picks a page's character encoding, why the declaration must say UTF-8 and come early, and the five rules that check it."
---

Before a browser can parse a page it has to turn bytes into characters. It looks for the
encoding in three places, in order: a byte order mark, the `charset` parameter of the
`Content-Type` response header, and a declaration in the markup. For the last one, the parser
[prescans](https://html.spec.whatwg.org/multipage/parsing.html#prescan-a-byte-stream-to-determine-its-encoding)
only the first 1,024 bytes. A declaration further down is never seen, and the browser
guesses.

A wrong guess shows up as mojibake, `café` rendered as `cafÃ©`, often only for visitors in
some locales. It is a security problem too: when the encoding is guessed, text an attacker
controls can change how the rest of the page decodes, which is how the classic UTF-7
cross-site scripting worked. The
[Encoding Standard](https://encoding.spec.whatwg.org/#names-and-labels) leaves one choice
for new content, UTF-8, and one declaration does the job:
`<meta charset="utf-8">`, first in the head.

Deadhead checks the declaration and the attributes that compete with it:

- [`head/charset-position`](/rules/head/charset-position): the declaration ends past byte
  1,024. Harmful. A charset in the `Content-Type` header takes precedence, which the
  [10,000 home pages post](/blog/what-10000-home-pages-put-in-their-head) found on most
  pages this rule reports.
- [`head/charset-multiple`](/rules/head/charset-multiple): more than one `<meta charset>`.
  Only the first counts.
- [`meta/charset-value`](/rules/meta/charset-value): any label other than `utf-8`.
- [`meta/http-equiv-content-type`](/rules/meta/http-equiv-content-type): the older
  `content-type` pragma, which says the same thing and may not appear beside
  `<meta charset>`.
- [`attr/charset-obsolete`](/rules/attr/charset-obsolete): `charset` on `<a>`, `<link>`
  and `<script>`. Serve the linked files as UTF-8 and the attribute has nothing to say.

None of the first four is autofixed: moving or relabelling a declaration changes how the
page decodes, and that has to be checked by a person.
