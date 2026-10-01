# Releasing

Both packages, `deadhead` and `eslint-plugin-deadhead`, are released together at
one version. A signed tag starts the Release workflow: it tests the packed
tarballs and **stages** them on npm through trusted publishing (OIDC, with
provenance). Nothing goes live until the maintainer approves each staged package
with 2FA. No npm token is ever created for this project.

0.1.0 was published by hand on 2026-10-01, because npm lets a package use trusted
publishing only once it exists. Both packages have had a trusted publisher since:
GitHub Actions, `cevdetta/deadhead`, `release.yml`, environment `npm`, stage only.

**Which CLI.** Every registry write that needs 2FA (approve, publish, unpublish,
deprecate) goes through npm: it confirms 2FA in the browser, which a security key
or passkey requires, while `pnpm` can only pass a 6-digit `--otp` code. Log in for
the task and out afterwards (`npm login`, `npm logout`). Read-only commands
(`view`, `stage list`) work with either.

`npm stage` needs npm 11.15 or newer; check `npm --version` first. A version
manager can put an older npm first on `PATH` (mise's Node 24.15 ships 11.12.1),
which answers `Unknown command: "stage"`. Run the system npm by its path, or
`npx npm@12.2.0 stage list`. The Release workflow runs `npx --yes npm@12.2.0` for the same
reason: `pnpm/setup` installs Node without npm, the runner's npm is older, and a
global npm install lands off `PATH`.

The changelog is written with [git-cliff](https://git-cliff.org), run by hand
(`cliff.toml`; not a dependency). It reads the squash-merged pull request titles,
which the PR title workflow holds to Conventional Commits.

## Every release

1. On a branch, set the new version in both `packages/cli/package.json` and
   `packages/eslint-plugin/package.json` (a test fails when they differ), then
   write the changelog section:

   ```sh
   uvx git-cliff@2.14.2 --tag vX.Y.Z --unreleased --prepend CHANGELOG.md
   ```

   (`pnpm dlx git-cliff@2.14.2` takes the same arguments.) Read the section,
   edit it if needed, open the release PR (`chore: release X.Y.Z`), merge it.
2. From an up-to-date `main`:

   ```sh
   git switch main && git pull --ff-only
   git tag -s vX.Y.Z -m vX.Y.Z
   git push origin vX.Y.Z
   ```

3. The Release workflow checks the tag against both manifests, runs the full
   chain, `pnpm check:packages` and the smoke test, stages the exact tarballs the
   smoke test installed, and creates the GitHub Release.

   If the workflow fails before it stages anything (no staged package, no GitHub
   Release), fix the cause on `main`, then move the tag to the fixed commit, since
   a re-run uses the workflow file at the tagged commit:

   ```sh
   git switch main && git pull --ff-only
   git push origin :refs/tags/vX.Y.Z && git tag -d vX.Y.Z
   git tag -s vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z
   ```

   Never move a tag once anything was staged or published.

4. Approve, once per package, with 2FA:

   ```sh
   npm login
   npm stage list
   npm stage view <stage-id>      # check name, version, file list
   npm stage approve <stage-id>
   npm logout
   ```

   `npm stage reject <stage-id>` drops a staged package instead.
5. Check from the registry, not the website: `npm view deadhead dist-tags
   --prefer-online` shows the new `latest`, and `npx deadhead@X.Y.Z --version`
   works in an empty directory. npmjs.com caches package pages and can lag
   behind for a while.

The workflow runs in the GitHub environment `npm`, which the trusted publishers
check. Cloudflare Pages builds `main`, so the rule pages match each release.

## Publishing a new package by hand

Trusted publishing needs the package to exist, so a new package name (as both
were for 0.1.0) gets its first version by hand. What 0.1.0 taught:

1. Build, check and pack on a clean `main`; the smoke test installs the tarballs
   it writes, and those are what you publish:

   ```sh
   pnpm install
   pnpm check:packages
   node scripts/smoke-packages.ts --out tarballs
   ```

2. Log in with npm and check it: `npm login`, then `npm whoami`. A stale token
   left in `~/.npmrc` makes the publish fail with a 404 on `PUT`: the registry
   answers an unauthenticated write as if the package did not exist.
3. Publish with a `./` path: npm 12 reads `tarballs/x.tgz` as GitHub shorthand
   (`EALLOWGIT`).

   ```sh
   npm publish ./tarballs/<name>-<version>.tgz --access public
   ```

   npm prints a URL; confirm with 2FA there. A `403 You cannot publish over the
   previously published versions` right after confirming means the publish went
   through and npm retried: check `npm view <name> versions --prefer-online`
   before trying again, and compare `npm view <name>@<version> dist.shasum` with
   `sha1sum tarballs/<name>-<version>.tgz`.
4. On npmjs.com, add the trusted publisher (GitHub Actions, `cevdetta/deadhead`,
   `release.yml`, environment `npm`) with "allow npm publish" and "allow npm
   dist-tag" both off, and set Publishing access to "Require two-factor
   authentication and disallow tokens". Setting this up before the first publish
   makes npm create a `0.0.0-stage` placeholder version; remove it within 72
   hours with `npm unpublish <name>@0.0.0-stage`, or deprecate it after that.
5. `npm logout`, then tag as in "Every release" step 2. The Release workflow
   skips staging for a version already on npm and still creates the GitHub
   Release.

From 0.1.0 on, rule ids are permanent: a rename goes through
`scripts/rename-rule.ts`, leaves a redirect, and its PR title carries `!`.
