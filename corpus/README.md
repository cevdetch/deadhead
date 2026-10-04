# corpus

Measures the share of top-ranked home pages on which each deadhead rule fires.
Private to this repo: never published in a package.

## Method

1. **List.** A Tranco top-N list, pinned by its ID (`pnpm corpus:list --id <ID> --n 10000`).
2. **Snapshot, once.** For each domain: robots.txt, then `https://<domain>/` (and
   `https://www.<domain>/` if the apex has no DNS, refuses or fails TLS), then headless
   Chromium on the final URL. Each domain becomes one gzipped record in
   `corpus/data/snapshot/`. Resumable: stop and rerun at any time.
3. **Lint, offline, any number of times.** Every rule, raw HTML and rendered DOM. Rules that
   read source positions are left out of the rendered pass.
4. **Aggregate.** Per rule: sites, rate with a Wilson 95% interval, and rates in ranks 1 to
   1,000 and 1,001 to 10,000. Written to `corpus/results/<date>-top<N>.json`.

Each domain ends as one of: linted, blocked (a challenge page), failed (an error status, a
timeout or not HTML), no-site (no DNS, refused or TLS failure), skipped (robots.txt) or
duplicate (its final address was already reached from a better-ranked domain).

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
