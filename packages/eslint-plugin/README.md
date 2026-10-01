# eslint-plugin-deadhead

The [deadhead](https://deadhead.cevdet.ch) rules in ESLint: deprecated,
unnecessary and harmful HTML, with autofix where removing the markup changes
nothing. Every finding links to a researched explanation with sources.

ESM only. ESLint 10, Node 24.8 or newer.

## Install

```sh
npm install --save-dev eslint eslint-plugin-deadhead
```

## Use

```js
// eslint.config.js
import { defineConfig } from "eslint/config";
import deadhead from "eslint-plugin-deadhead";

export default defineConfig([deadhead.configs.recommended]);
```

`recommended` turns on every harmful and deprecated rule: harmful ones are errors
and the rest warnings. `all` adds the unnecessary ones. Both apply to
`**/*.html` with `@html-eslint/parser`. Rule names are the rule ids with the
plugin prefix: `deadhead/meta/keywords`.

Layout partials and components are linted for the markup they hold and never
told to add head content another file supplies.

For the command line, use [`deadhead`](https://www.npmjs.com/package/deadhead).
Everything else is on the [site](https://deadhead.cevdet.ch/install) and in the
[repository](https://github.com/cevdetta/deadhead).
