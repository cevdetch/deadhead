# deadhead

A linter for deprecated, unnecessary and harmful HTML, mostly in the `<head>`.
Every finding links to a researched explanation with sources on
[deadhead.cevdet.ch](https://deadhead.cevdet.ch).

ESM only. Node 24.8 or newer.

## Install

```sh
npm install --save-dev deadhead
```

## Use

```sh
npx deadhead dist                    # walk a directory for .html and .htm
npx deadhead "src/**/*.html"         # quote it; the CLI does the expanding
npx deadhead --format=sarif dist     # stylish (default), json, sarif
npx deadhead --fail-on=harmful dist  # exit 1 only on harmful findings
npx deadhead --fix dist              # rewrite files, then report what is left
npx deadhead --jobs 4 dist           # lint large trees in worker threads
```

Exit codes: **0** nothing at or above the `--fail-on` threshold, **1** threshold
met, **2** usage, config or I/O error.

A `deadhead.config.ts` next to where you run it sets defaults:

```ts
import { defineConfig } from "deadhead";

export default defineConfig({
  failOn: "deprecated",
  rules: { "meta/keywords": "off" },
});
```

A file with a doctype or an `<html>` tag is linted as a page. Anything else, such
as a layout partial or a component, is a fragment: it is checked for the markup it
holds and never told to add head content another file supplies.

For ESLint, use [`eslint-plugin-deadhead`](https://www.npmjs.com/package/eslint-plugin-deadhead).
Everything else, including the bookmarklet, is on the
[site](https://deadhead.cevdet.ch/install) and in the
[repository](https://github.com/cevdetta/deadhead).
