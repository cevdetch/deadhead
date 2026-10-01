# Changelog

Both packages, `deadhead` and `eslint-plugin-deadhead`, share one version.
Adding or renaming a rule is a minor release; prose-only and fix-only changes
are patches. Rule ids are permanent from 0.1.0: a rename leaves a redirect and
is marked as breaking.

## 0.1.0 - 2026-10-01

First release. ESM only, Node 24.8 or newer; the ESLint plugin needs ESLint 10.

- 190 rules across attr/, document/, element/, head/, link/, meta/ and
  script/. Every finding links to its page on https://deadhead.cevdet.ch.
- CLI: stylish, JSON and SARIF output; --fix; baselines; suppression comments;
  --jobs for large trees; stdin. Layout partials and components are linted
  for what they hold.
- ESLint plugin: one rule per deadhead rule, `recommended` and `all` configs,
  autofix where the rule has one.
- Types generated from the source for `defineConfig` and the plugin.
- Published by hand from the tested tarballs. Every later release comes from
  CI with npm provenance, staged and approved with 2FA.
