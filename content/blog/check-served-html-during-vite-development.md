---
title: "Check served HTML during Vite development"
description: "Deadhead 0.3.0 adds a Vite plugin: check the HTML your dev server sends, with findings and advice in the terminal and DevTools console."
pubDate: "2026-10-13"
draft: false
---

Deadhead 0.3.0 adds `deadhead/vite`. Open a page during development and read its
findings in your terminal or DevTools console, with advice and a link to the
sources behind each rule.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import deadhead from "deadhead/vite";

export default defineConfig({ plugins: [deadhead()] });
```

You need Vite 8 and Node 24.8 or newer. Install `deadhead` as a dev dependency.
The CLI and Vite plugin share a package and parser.

## Use it with Astro

Astro uses the same plugin. Put it under `vite.plugins`:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import deadhead from "deadhead/vite";

export default defineConfig({
  vite: { plugins: [deadhead()] },
});
```

Start the dev server and open a page. Deadhead checks the HTML Astro sends and
reports in the terminal and DevTools. A clean page reports no findings. Astro
does not register the plugin from a top-level `plugins` property.

## Check what the server sends

The plugin checks HTML responses served through Vite's middleware stack. This
covers plain Vite apps and SSR routes on that stack, including streamed responses
after they finish. Line numbers refer to the served HTML, after Vite's transforms.
Open View Source to find the reported markup.

[Vite's HTML transform hook](https://vite.dev/guide/api-plugin.html#transformindexhtml)
does not run for some frameworks with their own entry handling. Checking the
response gives those routes the same lint pass. Frameworks that use a separate
HTML server need the CLI or bookmarklet. Client scripts can change the DOM after
the response arrives; use the bookmarklet to check those changes.

Reloading a page with the same findings leaves the terminal quiet. Changing its
findings prints a new report. DevTools gets a collapsed report for each page load,
grouped by rule.

## Use your existing rule settings

The plugin reads `deadhead.config.ts` from Vite's root. Plugin options override
the file, and `rules` overrides merge with its rule settings. URL filters match
paths without the leading slash or query string. If your CLI config includes
`dist/**/*.html`, set a dev filter:

```ts
deadhead({ include: ["**"], ignore: ["vendor/**"], console: false });
```

`console: false` keeps reports in the terminal and preserves response bytes and
headers. Restart Vite after changing the config. The plugin checks completed
UTF-8 HTML up to 2 MiB and passes streamed chunks through as they arrive. It skips
compressed responses and partial responses, and respects `Cache-Control: no-transform`.

Console reports use a module script appended after the page. The plugin removes
content length and digest headers, including ETag, when it injects that script.
It uses Vite's `html.cspNonce` if you set one. A CSP that blocks the script leaves
the terminal report available. Responses with strict content-length checking get
terminal output alone.

## Keep the build check

Use `"postbuild": "deadhead dist"` for production and CI. The Vite plugin reports
during development; the CLI checks the final HTML after your framework finishes
writing it. See [Install](/install) for the CLI and plugin setup.
