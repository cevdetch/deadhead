# deadhead

A linter for deprecated, unnecessary and harmful HTML, mostly in the `<head>`.
Every finding links to a researched explanation with sources on
[deadhead.cevdet.ch](https://deadhead.cevdet.ch).

ESM only. Node 24.8 or newer.

## Quick start

[Try HTML in your browser](https://deadhead.cevdet.ch/try) without installing
anything, or check a file or built site from your terminal:

```sh
npx deadhead index.html
npx deadhead dist
```

Run your project's build first. Replace `dist` with your HTML output directory;
Astro and Vite use `dist` by default. No configuration is required.

Each finding includes a file, line, severity and a link explaining what to change.
`npx deadhead --fix dist` removes fixable markup and reports what remains. Apply
changes to source templates too, so they survive the next build.

## Install

```sh
npm install --save-dev deadhead
```

Add a script to your existing `package.json`:

```json
{
  "scripts": {
    "lint:html": "deadhead dist"
  }
}
```

Run `npm run lint:html` after building, locally or in CI.

## Use

```sh
npx deadhead dist                    # walk a directory for .html and .htm
npx deadhead "src/**/*.html"         # quote it; the CLI does the expanding
npx deadhead --format=sarif dist     # stylish (default), json, sarif
npx deadhead --fail-on=harmful dist  # exit 1 only on harmful findings
npx deadhead --fix dist              # rewrite files, then report what is left
npx deadhead --jobs 4 dist           # lint large trees in worker threads
```

To check stdin, pass `-` as the only input:

```sh
cat page.html | npx deadhead - --stdin-filename page.html
```

`--stdin-filename` requires `-`. Baselines and baseline updates require files,
including when a baseline is set in `deadhead.config.ts`. `--jobs` must be a
positive integer; workers are bounded by available CPUs and the number of files.

JSON and SARIF reports remain complete JSON on stdout. Fix summaries and baseline
notices go to stderr with these formats. The CLI validates an existing baseline
before `--fix` writes any HTML.

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

## Vite

In a Vite 8 project:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import deadhead from "deadhead/vite";

export default defineConfig({ plugins: [deadhead()] });
```

In Astro, put the plugin under `vite.plugins` in `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import deadhead from "deadhead/vite";

export default defineConfig({
  vite: { plugins: [deadhead()] },
});
```

Astro does not register Vite plugins from a top-level `plugins` property. Start
the dev server and open a page to trigger a report. A clean page reports no
findings; starting the server alone does not lint pages.

Open a page during `vite dev` to see findings, advice and rule links in the
terminal and DevTools console. Positions refer to the served HTML. The plugin
also checks SSR HTML served through Vite's middleware stack, including streamed
responses after they finish. Frameworks with a separate HTML server need the CLI
or bookmarklet.

It reads `deadhead.config.ts` from Vite's `root`. Override `rules`, `skipTemplates`,
`include` or `ignore` in `deadhead({ ... })`; rule settings merge with the file.
Globs match URL paths without the leading `/` or query string. For a CLI config
that includes `dist/**/*.html`, set `include: ["**"]` in the plugin.
Set `console: false` for terminal output with unchanged response bytes and headers.
Restart Vite after config changes. `failOn` and `baseline` apply to the CLI.

Checks cover completed UTF-8 HTML up to 2 MiB. Compressed and partial responses,
and responses with `Cache-Control: no-transform`, pass through. Console injection
uses Vite's `html.cspNonce`; a CSP that blocks the script leaves terminal output
available. Console injection removes content length and digest headers, including
ETag. Strict content-length responses get terminal output alone.

Keep `"postbuild": "deadhead dist"` for production and CI. The plugin checks dev
responses; the CLI checks your framework's final build output.

For ESLint, use [`eslint-plugin-deadhead`](https://www.npmjs.com/package/eslint-plugin-deadhead).
Everything else, including the bookmarklet, is on the
[site](https://deadhead.cevdet.ch/install) and in the
[repository](https://github.com/cevdetch/deadhead).
