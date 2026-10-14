# deadhead

Deadheading is cutting the spent growth off a plant so the rest keeps blooming.
This does that to your `<head>`.

It finds HTML that is **harmful**, **deprecated** or **unnecessary**, and for every
finding it links to a written explanation of why, with sources.

```
$ npx deadhead dist

dist/index.html
  5:5  unnecessary  meta/revisit-after
       A crawl-schedule hint that search engines ignore; recrawl timing comes
       from sitemaps, not markup.
       -> Delete the element and publish change timing in an XML sitemap.
       https://deadhead.cevdet.ch/rules/meta/revisit-after

x 1 finding (1 unnecessary)
```

Severity is `harmful`, `deprecated` or `unnecessary` -- what the finding costs you,
not how loudly the tool wants to say it.

That last line is the whole point, and every rule is published at
**[deadhead.cevdet.ch](https://deadhead.cevdet.ch)**, generated from the same markdown
the linter is built from. The finding and its explanation cannot drift, because they
are the same file.

## Why another linter

Most tools tell you *that* something is wrong. Head markup needs *why*: whether
the advice you read in 2014 still holds. Every rule here
is a markdown document with at least two independent sources, and the linter is
generated from those documents. If a rule cannot be explained, it does not ship.

## Requirements

Node 24.8 or newer. Both packages are ESM only, and the ESLint plugin needs ESLint 10.

## Quick start

[Try deadhead in your browser](https://deadhead.cevdet.ch/try): paste HTML to see
findings, explanations and the fixed HTML without installing anything.

To check a file or a built site from your terminal:

```bash
npx deadhead index.html
npx deadhead dist
```

Run your project's build first, then replace `dist` with its HTML output directory.
For Astro and Vite, the default is `dist`. No configuration is required.

Each finding includes its file, line, severity and a link explaining what to change.
Use `npx deadhead --fix dist` to remove fixable markup; remaining findings need a
manual change. When checking generated HTML, apply the change to your source
template so it survives the next build.

To keep deadhead in your project:

```bash
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

Run `npm run lint:html` after building, locally or in CI. For checks while you
develop, use the [Vite and Astro setup](#vite); for an open page, use the
[bookmarklet](https://deadhead.cevdet.ch/install#bookmarklet).

## Usage

`deadhead` takes files, directories, or globs -- it expands globs itself, so they
behave the same in every shell:

```bash
npx deadhead dist                   # walk a directory for .html and .htm
npx deadhead "src/**/*.html"         # quote it; the CLI does the expanding
npx deadhead --format=sarif dist     # stylish (default), json, sarif
npx deadhead --fail-on=harmful dist  # exit 1 only on harmful findings
npx deadhead --skip-templates dist  # leave <template> contents alone
```

```bash
npx deadhead --fix dist             # rewrite files, then report what is left
```

To check stdin, pass `-` as the only input:

```bash
cat page.html | npx deadhead - --stdin-filename page.html
```

`--stdin-filename` requires `-`. Baselines and baseline updates require files,
including when a baseline is set in `deadhead.config.ts`. `--jobs` must be a
positive integer; workers are bounded by available CPUs and the number of files.

JSON and SARIF reports remain complete JSON on stdout. Fix summaries and baseline
notices go to stderr with these formats. The CLI validates an existing baseline
before `--fix` writes any HTML.

Exit codes are the CI contract: **0** nothing at or above the `--fail-on` threshold,
**1** threshold met, **2** usage, config or I/O error, no HTML files to lint, or an
internal error. A broken invocation never looks
like a clean run.

### Pages and fragments

A file is a **page** when it has a doctype or an `<html>` tag. Anything else is a
**fragment**: a layout partial, a component, a framework template. Other files
assemble fragments into the page, so a fragment is checked for the markup it holds
and never for head content it lacks. Four checks skip fragments: a missing viewport
(`head/viewport-missing`), a missing title (`head/title`; duplicate and empty titles
still report), Open Graph tags without the required set
(`meta/og-required-properties`) and Dublin Core names without their schema link
(`meta/dublin-core-without-schema`). Every other rule checks a fragment in full.
Markup outside a written `<head>` or `<body>` gets both the head and the body rules,
because the page decides where it lands. The CLI and the ESLint plugin build the same
tree for a fragment, so they report the same findings.

### Fixes are text edits, never re-serialised markup

`--fix` splices byte ranges out of the original file. It never parses your document and
prints it back, because that rewrites quote style and attribute order across the whole
file. Whitespace and character references shift with them, turning a one-line fix into
a thousand-line
diff. The same property is what makes ESLint autofix free, and the conformance suite
asserts the two produce byte-identical output.

A fix is one of `remove-element`, `remove-attribute`, `remove-attributes`, `remove-token`,
`remove-tokens` or `none`. They all subtract: nothing asserts a value the rule was never
asked about. `remove-token` drops a single keyword from a space-separated attribute:
`rel="shortcut icon mask-icon"` becomes `rel="icon mask-icon"`. It edits inside the
quotes, so the delimiter you chose survives. `remove-tokens` deletes every keyword the
selector tests with `[attr~=…]`; it removes the element only when none survive.
`remove-attributes` deletes every attribute the selector tests by a bare `[attr]`
presence test, keeping every other attribute as written.

Two things are never fixed automatically: a rule that declares `fix: { op: "none" }`, and
any rule whose `detectability` is `partial`: if the rule is not certain, it does not get
to edit your file. The fixer skips overlapping fixes rather than merging them, and a
second pass
picks them up.

### Configuration

`deadhead.config.ts`, optional, read from the project directory. Every flag beats it.

```ts
export default {
  include: ["dist/**/*.html"],
  ignore: ["**/vendor/**"],
  rules: {
    "meta/http-equiv-x-ua-compatible": "off",
    "attr/script-type-javascript": "harmful",   // or re-severity it
  },
  failOn: "deprecated",
  baseline: ".deadhead-baseline.json",
};
```

Wrapping the object in `defineConfig` from `deadhead` gets you completion and type
checking; a plain object works either way.

A typo in a rule id is an error rather than a setting that silently does nothing. The
failure it prevents is a rule you thought you had disabled still being on.

### Vite

Use `deadhead/vite` with Vite 8 to check pages as you open them during development:

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

You get findings with advice and rule links in the terminal and in a collapsed
DevTools console group. The terminal prints again when a page's findings change.
Positions refer to the **served HTML**, including Vite's transforms, so SSR routes
served through Vite's middleware stack get the same check. Frameworks that serve
HTML through a separate server need the CLI or bookmarklet.

The plugin reads `deadhead.config.ts` from Vite's `root`. Options override `include`,
`ignore` and `skipTemplates`; `rules` overrides merge with the config's rule settings.
For this plugin, globs match URL paths without the leading `/` or query string.
If your CLI config includes `dist/**/*.html`, override `include` for dev:

```ts
deadhead({ include: ["**"], ignore: ["vendor/**"], console: false });
```

`console: false` keeps reports in the terminal and leaves response bytes and
headers intact. Restart Vite after changing deadhead's config. `failOn` and
`baseline` belong to the CLI; the dev plugin reports without fixing files or
blocking the page.

The plugin checks completed UTF-8 HTML responses up to 2 MiB. It passes streamed
chunks through as they arrive and reports after the response ends. It skips
compressed responses, partial responses and `Cache-Control: no-transform`.
For console output it appends a module script and removes content length and
digest headers, including ETag. With Node's strict content-length checking it
keeps the report in the terminal. The script uses Vite's `html.cspNonce` if set;
on pages whose CSP blocks it, the terminal report still works.

For production and CI, keep `"postbuild": "deadhead dist"`. The plugin runs during
`vite dev`; the CLI checks the final output after your framework completes its build.

### Baseline

Adopt deadhead on an existing site without fixing the backlog first:

```bash
npx deadhead --baseline .deadhead-baseline.json --update-baseline dist   # accept today
npx deadhead --baseline .deadhead-baseline.json dist                     # fail only on new
```

The baseline records a **count per file per rule**, not line numbers or source hashes.
Those rot: reindent a file, or add an element above, and every entry below it would go
stale and light up CI with findings nobody introduced. An
allowance of 3 absorbs a *different* third finding of the same rule in the same file.
When the backlog shrinks, deadhead says so and suggests pruning.

Silence a finding in the markup itself:

```html
<!-- deadhead-disable-next-line meta/http-equiv-x-ua-compatible -->
<meta http-equiv="X-UA-Compatible" content="IE=edge">
```

`<!-- deadhead-disable -->` (optionally with rule ids) turns findings off until
`<!-- deadhead-enable -->`. Only actual HTML comments act as directives; strings
inside scripts, styles or attributes do not. The engine never lints contents of `<pre>`, `<code>`,
`<textarea>`, `<samp>`, `<kbd>`, `<iframe>`, `<noembed>`, `<noframes>`, `<noscript>`,
`<plaintext>`, `<title>` and `<xmp>` -- documenting bad markup is not writing it.

Other commands:

```bash
pnpm validate:rules   # frontmatter and rule docs fail fast, before the suite
pnpm test             # full test suite (node:test)
pnpm test:conformance # every fixture through every adapter
pnpm typecheck        # strict typecheck (core, rules, cli, scripts, tests)
pnpm check:self       # run the linter over its own clean fixtures
pnpm check:site       # build the docs site, lint its own <head>, and check the byte budget, headers, 404 page, and page titles and descriptions
pnpm lint:deps        # dependency hygiene check
```

### Documentation site

```bash
pnpm site:dev         # Astro dev server on the rule markdown
pnpm site:build       # static build to site/dist
pnpm site:preview     # preview static build of site/dist
pnpm site:check       # typecheck the .astro files
```

[`site/`](site) is an Astro project that reads `content/rules/**/*.md` in place -- no
copy, no second corpus -- and publishes each one at `/rules/<ruleId>`, the exact url
every finding prints. Its enums are imported from
[`packages/core/vocabulary.ts`](packages/core/vocabulary.ts), so a site that could
render a severity the engine rejects will not typecheck.

It is also a fixture. `pnpm check:site` runs the CLI over the rendered output, which
means the head this project ships is held to the rules this project ships -- in a
document assembled by a framework, which is where head markup goes wrong.

## Three ways to run it

- **CLI** for CI and pre-commit: `npx deadhead dist`
- **Bookmarklet** to inspect any page you are looking at, including pages you did not
  build. It reads the rendered DOM, which is the ground truth for what shipped.
- **ESLint plugin** for editor feedback while you type. A convenience, not the
  foundation: for framework users the head tags live in JSX, Vue or Svelte where
  an HTML parser never sees them.

All three run the same rule set and are tested against each other, so they cannot
disagree. `pnpm test:conformance` runs every fixture through every adapter and fails
if they diverge, including the built bookmarklet, executed as a bundle.

### Browser artifacts

```bash
pnpm build && pnpm build:bookmarklet && pnpm build:css
```

`packages/browser/bookmarklet.js` is one self-contained IIFE with the rules inlined and
no network access at all, so a strict Content-Security-Policy cannot block it.
That matters, because a locked-down page is the one worth inspecting. The same file is
the devtools snippet: paste it into **Sources → Snippets** and run.

`packages/browser/deadhead.css` outlines offenders in place, in the
[ct.css](https://csswizardry.com/ct/) spirit, using `head, head * { display: block }` to
give head elements a box to draw. Only rules whose selector alone decides the finding
appear in it: a `kind: "document"` rule asks something CSS cannot ask, and a rule
refined by a `match` function stays out, because its selector is a pre-filter and
drawing it would outline markup the engine passes.

### ESLint

```bash
npm install --save-dev eslint eslint-plugin-deadhead
```

```js
// eslint.config.js
import { defineConfig } from "eslint/config";
import deadhead from "eslint-plugin-deadhead";

export default defineConfig([deadhead.configs.recommended]);
```

Each config applies to `**/*.html` with `@html-eslint/parser`. The plugin needs ESLint 10.

Rule names are the `ruleId` verbatim (`deadhead/meta/http-equiv-x-ua-compatible`),
because ESLint splits an unscoped rule id on its first slash. The ESLint config, the CLI
output, your suppression comments and the markdown all say the same permanent string.

`configs.recommended` enables everything above `unnecessary`; `configs.all` enables every
rule. Severity stays yours to set.

### What the DOM cannot see

A rendered document has no source text, so `range()` and `loc()` are `null` in the
browser. The browser adapter offers no fixes, and the engine does not read suppression
comments there. A rule whose
verdict depends on byte offsets does not fire there. `head/charset-position` asks whether
a declaration
lands inside the first 1024 bytes, and a live DOM has no offsets to compare. That asymmetry is
declared in the conformance suite and asserted in both directions, so it cannot quietly
become drift.

## Status

The packages are on npm as [`deadhead`](https://www.npmjs.com/package/deadhead) and
[`eslint-plugin-deadhead`](https://www.npmjs.com/package/eslint-plugin-deadhead), with 203
rules; see [CHANGELOG.md](CHANGELOG.md). All three runtimes work and are checked against
each other, and rule ids are permanent since 0.1.0. One markdown file per rule;
see the site for the list. It grows one researched rule at a time, and that is the
bottleneck by design.

## Contributing

One rule per issue, one rule per pull request. Open a **New rule** issue; the form is
the research checklist. See [CONTRIBUTING.md](CONTRIBUTING.md).

Working from a clone needs Node 24 or newer (`engine-strict=true` in [`.npmrc`](.npmrc))
and pnpm at the version pinned in [`package.json`](package.json)'s `packageManager`:

```bash
pnpm install
pnpm build              # generates the rule registry that typecheck and tests read
pnpm check path/to/html
```

## License

[MIT License](LICENSE)
