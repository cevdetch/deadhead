---
ruleId: "attr/input-number-maxlength-size"
title: "<input type=\"number\"> maxlength and size"
description: "maxlength and size do nothing on number inputs; they sized legacy text fallbacks, so delete them."
pubDate: "2026-09-21"
status: "avoid"
severity: "unnecessary"
standardsBasis: "spec"
detectability: "yes"
kind: "element"
scope: "body"
selector: 'input[type="number" i][maxlength], input[type="number" i][size]'
match: "logic"
fix: { op: "remove-attributes" }
replacement: "Delete the hints and bound the control with min and max: <input type=\"number\" name=\"qty\" min=\"0\" max=\"100\">. Size it with CSS width where the layout needs it."
tags: ["forms"]
impacts: ["maintainability"]
related: ["attr/input-ismap-usemap"]
---

`maxlength` and `size` do nothing on number inputs. WHATWG keeps both as warning-level hints for legacy agents that render a text control in place of the number control; modern engines honor neither, so the pair is dead weight on every number input that carries it.

## Why avoid

WHATWG lists both as warning-level with one rationale. Section 16.1 says authors should not specify `maxlength` and `size` on `input` elements whose `type` is in the Number state, giving legacy user agents without `type="number"` support as the reason the door stays open: the hints sized the text control those agents rendered. Modern engines honor neither: `maxlength` constrains text-ish types alone, and `size` never sized number controls.

MDN says the same from the element side. Its number page lists the supported attributes with no `maxlength` or `size` among them, and its sizing section states that number inputs do not support form sizing attributes such as `size`, with CSS as the recourse. A `maxlength="3"` that caps nothing and a `size="3"` that widths nothing both ask the browser for behavior it never performs.

## Use instead

Bound the control with `min` and `max`, and size it in CSS:

```html
<input type="number" name="qty" min="0" max="100">
```

```css
input[name="qty"] { width: 4em; }
```

## Detectability

Complete detection. The rule matches `input[type="number"][maxlength]` or `input[type="number"][size]`: presence of either attribute on a number input is the whole verdict. The `i` flag folds ASCII case on the `type` value.

The autofix runs only where `maxlength` is absent, and then removes `size`. Browsers ignore `maxlength` on a number input, but scripts do not: the `maxLength` IDL attribute reflects the content attribute on every input type, so `this.value.slice(0, this.maxLength)` caps the input that the browser leaves uncapped. Before deleting `maxlength`, look for a script that reads it.

## Resources

- [WHATWG: Obsolete but conforming features](https://html.spec.whatwg.org/multipage/obsolete.html#obsolete-but-conforming-features): `maxlength` and `size` on Number-state inputs exist for legacy agents alone.
- [WHATWG HTML: `maxLength` IDL attribute](https://html.spec.whatwg.org/multipage/input.html#dom-input-maxlength): it must reflect the `maxlength` content attribute, with no condition on the input's type.
- [MDN: `<input type="number">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/number): the supported attributes exclude both, and number inputs do not support sizing attributes such as `size`.
