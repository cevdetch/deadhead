# Contributing

The unit of work here is **one rule**: one issue, one pull request.

## Setup

Node `>=24` is required and enforced at install time (see `engines` in
[`package.json`](package.json) and `engine-strict=true` in [`.npmrc`](.npmrc)).

```bash
npm install -g pnpm  # skip if you already have any pnpm
pnpm install
pnpm test
```

Any pnpm bootstraps itself to the version pinned in the `packageManager`
field of [`package.json`](package.json), so every contributor runs the same
tool.

## Adding a rule

1. Open a **New rule** issue. The form mirrors the rule's frontmatter field for field,
   so filling it in *is* the research. If you cannot produce two independent sources,
   the rule is not ready, and finding that out costs you ten minutes instead of a
   review cycle.
2. Add `content/rules/<namespace>/<name>.md`, plus fixtures at
   `test/fixtures/<ruleId>/invalid.html` and `valid.html`.
3. Most rules need no code. If the selector subset cannot express the match, add
   `packages/rules/logic/<ruleId>.ts`.
4. `pnpm validate:rules && pnpm test`.

The pull request template carries the full definition of done.

### Rule checklist

- [ ] Frontmatter validates (`pnpm validate:rules`), and `ruleId` matches the file path
- [ ] At least two independent sources under `## Resources` (spec text, browser bug
      tracker, vendor documentation, or a well-argued primary post)
- [ ] `## Why avoid` (or `## Why use`) states the concrete consequence for users,
      never "it's old"
- [ ] `## Use instead` has runnable markup, or explicitly says "delete it"
- [ ] `severity` is justified: `harmful` breaks something for users; `deprecated` is
      formally obsolete but inert; `unnecessary` works but is dead weight
- [ ] A rule that reports head content as missing returns nothing when
      `!doc.isPage()`: a fragment (no doctype, no `<html>`) gets that content from
      another file. Every other rule ignores `isPage()`

### Rules never touch a parser

Rule logic only sees the element port (`tag`, `attr`, `hasAttr`, `attrNames`,
`text`, `parent`, `children`, `index`, `range`, `loc`). No `parse5` types, no DOM
`Element`, no ESLint AST. If a rule needs something the port lacks, extend the port
for all three adapters at once. Document rules also get `querySelector`,
`querySelectorAll`, `doctype()` and `isPage()`.

### Fixtures must be well-formed HTML

The conformance suite runs every fixture through every adapter and asserts identical
findings, but the DOM parser used in tests is not spec-compliant for tree
construction the way `parse5` is. Keep conformance fixtures well-formed; test
malformed input (implicit `<head>`, misnested tags, stray `</p>`) against the parse5
adapter only, in its own suite. Fixtures are byte-offset-sensitive: do not reformat
them, and leave trailing whitespace and final newlines alone (enforced by
[`.editorconfig`](.editorconfig) and [`.gitattributes`](.gitattributes)).

Fragments (partials and components, with no doctype and no `<html>`) live in
`test/fragments/` and run through the parse5 and ESLint adapters only: the DOM
adapter only ever sees an assembled page.

## Naming a rule

An id is `<namespace>/<subject>[-<condition>]`: lowercase ASCII kebab-case, at most 40
characters after the slash. It says **where the thing lives**, **what it is**, and, only
when the rule checks one condition, **which condition**. It never says what the tool
thinks of it.

1. **Namespaces say where the construct lives:**
   - `element/<tag>`: an element. A group is named after its main element: `element/frameset` (frame, noframes), `element/font-face` (the SVG font elements).
   - `attr/<element>-<attribute>`: attributes on one element; spell up to three (`attr/a-coords-shape`). More than three: `attr/<element>-<topic>` with a topic from a closed list: `presentational`, `plugin`. One attribute on several elements: `attr/<attribute>` only when the rule flags it on every element that can carry it (`attr/methods`, `attr/dropzone`); spell up to three (`attr/contextmenu-onshow`). When the attribute stays valid on some other element, the id is `attr/<attribute>-obsolete`: the attribute on every element where HTML §16 marks it obsolete. The id never lists those elements, so a newly obsoleted element joins the rule without a rename: `attr/charset-obsolete` (`<meta charset>` is live), `attr/name-obsolete` (`name` is live on form controls, `iframe`, `meta`, `map`). `link/` and `meta/` ids already name their element. SVG attributes take the family prefix `svg-`.
   - `link/<keyword>`: one `rel` keyword, spelled verbatim (`link/sitemap`, `link/canonical-http`).
   - `meta/<name>`, `meta/http-equiv-<value>`, `meta/og-<property>` and `meta/csp-<directive>`: one `name`, pragma, Open Graph property or CSP directive, spelled verbatim.
   - `head/`: count, order and presence across `<head>`. `document/`: the same across the whole document.
   - `script/<content-type>-<subject>`: what is *inside* a script (`script/json-ld-syntax`). Attributes on `<script>` are `attr/`.
2. **Spell keywords verbatim:** lowercased, with `_` becoming `-`, and an `x-` prefix kept (`meta/http-equiv-x-ua-compatible`, `meta/news-keywords`).
3. **A rule covering several keywords of one kind names the group with a plural noun**, from a closed list per namespace:
   - `link/<kind>-keywords`
   - `meta/<kind>-names`
   - `meta/http-equiv-<kind>-pragmas`
   - `meta/og-<kind>-properties`
   - `attr/<family>-attributes`

   `<kind>` describes what the members have in common (`navigation`, `vendor`, `verification`, `cache`, `contact`), never a verdict.
4. **Condition suffixes come from a closed list**, subject first: `-missing`, `-multiple`, `-empty`, `-position`, `-value` (a value outside the allowed set), `-relative`, `-http`, `-attribute` (the construct in the wrong attribute), `-without-<x>`. A rule that checks several conditions of one subject uses the subject alone (`head/title`: missing, duplicate or empty).
5. **Never a verdict word:** obsolete, deprecated, removed, retired, dead, dropped, legacy, invalid, misuse, old, bad, broken. One exception, from rule 1: `attr/<attribute>-obsolete`, where `obsolete` is HTML §16's own category for an attribute that stays valid elsewhere. The validator lists those ids in `OBSOLETE_ATTRIBUTE_IDS`. A spec version is allowed when it is the only thing the members share (`attr/svg-1-1-attributes`).
6. **Group by kind and consequence, never by era.** Split out any member whose fix or consequence differs, so the safe members keep an autofix.
7. **One owner per keyword.** A catch-all (`meta/http-equiv-unregistered-pragmas`) excludes every value another rule owns.
8. **Titles show the markup.** An element or attribute rule's title is the markup in angle brackets with quoted values: `<meta name="keywords">`, `<link rel="copyright">`, `<svg baseProfile>`. A group's title is the markup plus its plural noun: `<table> presentational attributes`, `<link rel> navigation keywords`. A document or head rule's title is a short sentence-case phrase: `Doctype missing or in quirks mode`. **Descriptions are ≤140 characters** and state the consequence. The site builds the page `<title>` from these. `pnpm check:site` enforces the built result: every page title is unique and at most 60 characters, a rule page showing `<title>: <verdict>` when that fits and the bare title otherwise, so a title over 60 characters fails; every page description, including a rule's `description`, a topic or impact blurb, must be 50 to 160 characters.
9. **Severity and basis follow the spec text.** HTML §16.1 "obsolete but conforming" and "authors should omit" → `unnecessary` / `spec`. HTML §16.2 non-conforming, or dropped from a spec that once defined it → `deprecated` / `spec-obsolete` when inert. Anything that breaks behaviour for users → `harmful`, whatever its basis.

`pnpm validate:rules` enforces rules 5 and 8's length limit: a `ruleId` carrying a
verdict word, or a `description` over 140 characters, fails with `file:line:col`, unless
the id is in `scripts/schema.ts`'s `LEGACY_IDS` (predates this convention; shrinks to
empty as rules are renamed) or `LONG_DESCRIPTION_IDS` (predates the length limit; shrinks
to empty as descriptions are rewritten).

## Disagreeing with a rule

Please do. Every rendered rule page links back to its source file. Open a discussion
or a pull request against the markdown. A rule that turns out to be wrong, or that
stopped being true because browsers changed, is the most useful issue you can file.

## Code conventions

- ESM only. Relative imports carry the `.ts` extension (Node requires it at runtime).
- Source is real `.ts` run directly by Node's type stripping. Keep it erasable:
  no enums, namespaces, or parameter properties (`erasableSyntaxOnly` enforces this).
- `packages/core` and `packages/rules` have zero runtime dependencies. `parse5`
  belongs to the CLI adapter alone.
- Run `pnpm typecheck` before pushing.

## Architecture

Keep the three runtimes (CLI, bookmarklet, ESLint plugin) from drifting into
three separate projects: extend shared contracts (the element port, rule
schemas) for all adapters at once, and propose design changes via an issue
before opening a PR.
