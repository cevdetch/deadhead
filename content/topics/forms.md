---
description: "Form controls and form attributes the HTML Standard dropped, from isindex and keygen to the accept and maxlength hints nothing reads."
---

Forms changed less than most of HTML, but they still collected markup that does nothing
today. Some of it is whole elements: `<isindex>`, the web's first search box, older than
forms themselves, and `<keygen>`, which generated a key pair in the browser for certificate
enrolment and was removed from the HTML Standard outright. Neither renders a working control
in any current browser, so a page that still relies on one has a form that cannot be used.

The rest is attributes in the wrong place. `accept` belongs on file inputs, not on the
`<form>`. `ismap` and `usemap` do nothing on an `<input type="image">`. `maxlength` and
`size` do nothing on a number input, whose limits are `min`, `max` and `step`. And `align`,
`border`, `hspace` and `vspace` on inputs are presentational attributes CSS replaced.

Deadhead reports six:

- [`element/isindex`](/rules/element/isindex) and [`element/keygen`](/rules/element/keygen):
  the two dead controls. Replace `isindex` with a form and a text input; certificate
  enrolment moved to [Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
- [`attr/form-accept`](/rules/attr/form-accept),
  [`attr/input-ismap-usemap`](/rules/attr/input-ismap-usemap) and
  [`attr/input-number-maxlength-size`](/rules/attr/input-number-maxlength-size): attributes
  no browser reads on that element. The fix deletes them.
- [`attr/input-presentational`](/rules/attr/input-presentational): styling written as
  attributes. No autofix, because the browser still applies it until CSS takes over.

The HTML Standard's
[obsolete features](https://html.spec.whatwg.org/multipage/obsolete.html) section lists each
one with its replacement.
