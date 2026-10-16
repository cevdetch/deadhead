# Releasing

Both packages, `deadhead` and `eslint-plugin-deadhead`, are released together at
one version. A signed tag starts the Release workflow: it tests the packed
tarballs and **stages** them on npm through trusted publishing (OIDC, with
provenance). Nothing goes live until the maintainer approves each staged package
with 2FA. No npm token is ever created for this project.

0.1.0 was published by hand on 2026-10-01, because npm lets a package use trusted
publishing only once it exists. For both packages, configure the trusted publisher
as GitHub Actions, `cevdetch/deadhead`, `release.yml`, environment `npm`, stage only.
Verify these settings after a repository rename and before the next release.

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

   **First release after the identity migration.** The commit-message rewrite
   preserved the signed release tags on their original history. Until a release
   tag exists on the current history, `--unreleased` includes entries that already
   shipped. For this first release, replace the command above with:

   ```sh
   uvx git-cliff@2.14.2 84998652a6e3e6cb77897440cfccbee4ed9fb9f7..HEAD --tag vX.Y.Z --prepend CHANGELOG.md
   ```

   That commit has the same file tree as the published `v0.3.1` tag and is its
   counterpart on the rewritten history. After the next release tag, resume the
   normal `--unreleased` command. Keep the existing published tags unchanged.

2. Dry-run the Release workflow on `main` and wait for it to pass: it runs the
   whole job up to `npm stage publish --dry-run`, uploads nothing and creates no
   release:

   ```sh
   gh workflow run release.yml --ref main
   gh run watch $(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')
   ```

   Then, from an up-to-date `main`:

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

   A freshly staged package shows `status: validating` while npm's automated
   review runs, and `approve` answers `409 Conflict … automated review hasn't
   finished` until it is done. Wait a few minutes and run `npm stage list` again.
   The `shasum` it lists can be compared with a tarball packed locally from the
   tagged commit (`npm pack` in each package): for 0.2.0 both matched.
5. Check from the registry, not the website. After approval the version reaches
   the registry metadata within a minute or two, the tarball and the
   attestations URL some minutes later, so a 404 on either right after approval
   is lag:

   ```sh
   npm view deadhead dist-tags --prefer-online
   cd "$(mktemp -d)" && npm init -y && npm install deadhead@X.Y.Z eslint-plugin-deadhead@X.Y.Z --prefer-online
   npx deadhead --version
   npm audit signatures            # once the attestations URL answers
   ```

   Without `--prefer-online`, npm can answer from a cached copy of the package
   list that predates the release (`ETARGET`). npmjs.com caches package pages and
   can lag behind longer.

The workflow runs in the GitHub environment `npm`, which the trusted publishers
check. Cloudflare Pages builds `main`, so the rule pages match each release.

## Moving package ownership to another npm account

npm does not support renaming an account. Create the new account, verify its email,
and enable two-factor authentication before transferring package access. Keep the
existing unscoped package names, `deadhead` and `eslint-plugin-deadhead`, so users
keep the same install commands and imports. No new package or republish is needed
to transfer ownership.

1. Log in as the current owner and confirm the account with `npm whoami`. Invite
   the new account to both packages:

   ```sh
   npm owner add cevdetch deadhead
   npm owner add cevdetch eslint-plugin-deadhead
   npm logout
   ```

2. Accept both invitations from the new account's email. Log in as `cevdetch`,
   check `npm whoami`, then verify membership with `npm owner ls deadhead` and
   `npm owner ls eslint-plugin-deadhead`.
3. In each package's npm settings, verify the GitHub trusted publisher:
   organization or user `cevdetch`, repository `deadhead`, workflow `release.yml`,
   environment `npm`. Keep direct publishing and dist-tag changes off, and retain
   the package policy requiring 2FA and disallowing tokens. A new trusted publisher
   configuration needs its first successful publish within two days, so schedule
   any replacement alongside the next release.
4. Use the next planned release to verify staging and approval under the new
   account. Check the published package's provenance against that release's tag.
   Account migration does not change earlier release metadata or attestations.
5. Once access and the release flow work, remove the previous account from each
   package with `npm owner rm <previous-username> <package-name>`. Confirm the owner
   lists afterwards, then log out. Keep the previous account available until all
   of its packages and organization memberships have been reviewed.

See npm's [account rename guidance](https://docs.npmjs.com/changing-your-npm-username/),
[package transfer instructions](https://docs.npmjs.com/transferring-a-package-from-a-user-account-to-another-user-account/),
and [trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

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
4. On npmjs.com, add the trusted publisher (GitHub Actions, `cevdetch/deadhead`,
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
