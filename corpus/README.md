# corpus

Measures the share of top-ranked home pages on which each deadhead rule fires.
Private to this repo: never published in a package.

## Method

1. **List.** A Tranco top-N list, pinned by its ID (`pnpm corpus:list --id <ID> --n 10000`).
2. **Snapshot, once.** For each domain: robots.txt, then `https://<domain>/`, then
   `https://www.<domain>/` unless the apex answered with a page or a wall (401, 403,
   429). Then headless Chromium on the final URL, for every domain that is not skipped
   or no-site: a real browser gets past some walls and error pages that turn the raw
   fetch away. Each domain becomes one gzipped record in `corpus/data/snapshot/`.
   Resumable: stop and rerun at any time.
3. **Lint, offline, any number of times.** Every rule, raw HTML and rendered DOM. Rules that
   read source positions are left out of the rendered pass.
4. **Aggregate.** Per rule: sites, rate with a Wilson 95% interval, and rates in ranks 1 to
   1,000 and 1,001 to 10,000. Written to `corpus/results/<date>-top<N>.json`. Alongside:
   - **Severity:** the share of sites with at least one harmful, deprecated or unnecessary
     finding, and findings per page.
   - **Injected by scripts:** for each rule, among sites linted raw and rendered, the share
     of its rendered sites where only the rendered DOM has it.
   - **Bytes:** each page raw, gzip (level 6) and brotli (quality 5), and what applying
     every autofix saves in each. Per rule and per removed item (`meta[name=twitter:title]`,
     `script[type]`), the raw bytes the fixes remove. A rule with fix op `none` removes
     nothing here, at any rate. Items on fewer than 10 sites are left out.
   - **Charset header:** per rule, how many of its sites name a charset in the
     `Content-Type` response header, which takes precedence over a `<meta charset>`.
   - **Platforms:** about 18 platforms detected from markup signatures in `platforms.ts`
     (generator meta, asset paths, framework attributes). For each with at least 30 linted
     sites: findings per page, severity shares, bytes saved and the rules most
     over-represented there.

Each domain ends as one of: linted, blocked (a challenge or block page, including one
served with 401, 403 or 429), failed (another error status, a timeout or not HTML),
no-site (no DNS, refused or TLS failure), skipped (robots.txt) or duplicate (its final
address was already reached from a better-ranked domain). Raw and rendered are classified
apart: a site blocked raw can be linted rendered.

No challenge is solved on a human's behalf, and the user agent always names the project.
Chromium passes a wall only when the wall admits a real browser.

## Limits

Measured on the 2026-10-04 run (Tranco Y83KG, top 10,000):

- **Desktop pages.** The user agent is desktop Chrome. A site that serves a separate
  mobile page is measured on its desktop page, so `head/viewport-missing` counts sites
  whose mobile page has a viewport.
- **Mirrors on other addresses.** Duplicates are matched by final address. A site that
  serves one template on several addresses without redirecting counts once per address:
  58 extra sites (1.3% of linted), the largest a mirror network of 20 addresses.
- **Pages that are not home pages.** A hand check of the raw-linted titles found 8 of
  4,973 that are a geo block, an error page, a soft 404 or an interstitial (0.16%).

## Ethics

- One robots.txt request, one page request and one Chromium visit per site.
- robots.txt is honoured: a site that disallows `/` for `deadhead-research` or for `*` is
  skipped.
- The user agent names the project and links https://deadhead.cevdet.ch.
- Only aggregate counts are committed or published. No domain names, no page content.
  Snippets printed for triage stay on the machine that ran the crawl.
- Site owners who want to be left out of future runs can open an issue.

## Running it

Runs on a machine with a residential connection, `chromium` on `PATH` (or `$CHROMIUM`) and
about 1 GB free. Not in CI.

    pnpm corpus:list --id Q2K34 --n 1000
    pnpm corpus:snapshot --list corpus/data/list-Q2K34-1000.csv
    pnpm corpus:lint
    pnpm corpus:aggregate --lint corpus/data/lint-<commit>.jsonl --list-meta corpus/data/list-Q2K34.json

Triage one rule from the snapshot: `pnpm corpus:lint --rule <ruleId> --samples 20`.

Only `corpus/results/` is committed; `corpus/data/` is gitignored.
