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

- Node `>=24.0.0` (enforced at install time via `engine-strict=true` in [`.npmrc`](.npmrc))
- pnpm (version pinned in the `packageManager` field of [`package.json`](package.json))

## Install

```bash
pnpm install
```

## Usage

> Not yet published. From a clone: `pnpm install && pnpm build && pnpm check <path>`.

Build the rule set from the markdown source of truth, then run the CLI:

```bash
pnpm build
pnpm check -- path/to/your/html
```

`pnpm build` comes first: it generates the rule registry typecheck and tests
read, so run it before `pnpm typecheck` on a fresh clone.

`deadhead` takes files, directories, or globs -- it expands globs itself, so they
behave the same in every shell:

```bash
deadhead dist                        # walk a directory for .html and .htm
deadhead "src/**/*.html"             # quote it; the CLI does the expanding
deadhead --format=sarif dist         # stylish (default), json, sarif
deadhead --fail-on=harmful dist      # exit 1 only on harmful findings
deadhead --skip-templates dist       # leave <template> contents alone
```

```bash
deadhead --fix dist                   # rewrite files, then report what is left
```

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

Once the packages are published, wrapping the object in `defineConfig` from
`@deadhead/cli` gets you completion and type checking; a plain object works either way.

A typo in a rule id is an error rather than a setting that silently does nothing. The
failure it prevents is a rule you thought you had disabled still being on.

### Baseline

Adopt deadhead on an existing site without fixing the backlog first:

```bash
deadhead --baseline .deadhead-baseline.json --update-baseline dist   # accept today
deadhead --baseline .deadhead-baseline.json dist                     # fail only on new
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
`<!-- deadhead-enable -->`. The engine never lints contents of `<pre>`, `<code>`,
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

```js
// eslint.config.js
import htmlParser from "@html-eslint/parser";
import deadhead from "eslint-plugin-deadhead";

export default [
  {
    files: ["**/*.html"],
    languageOptions: { parser: htmlParser },
    plugins: { deadhead },
    rules: deadhead.configs.recommended.rules,
  },
];
```

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

Early in development, but the foundations are in place: all three runtimes work and are
checked against each other, autofix, the config file and the baseline file have landed,
and the rule documentation is published. One markdown file per rule; see the site for the
list. It grows one researched rule at a time, and that is the bottleneck by design.

## Contributing

One rule per issue, one rule per pull request. Open a **New rule** issue; the form is
the research checklist. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT License](LICENSE)
