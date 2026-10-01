# Releasing

Both packages, `deadhead` and `eslint-plugin-deadhead`, are released together at
one version. Registry commands use pnpm, which keeps its own login (`pnpm login`,
checked with `pnpm whoami`); pnpm 12 has `publish`, `stage`, `view` and
`deprecate`. No npm token is ever created for this project.

- **0.1.0** is published by hand from the tarballs the smoke test installed: npm
  lets a package use trusted publishing only once it exists.
- **Every later release** starts from a signed tag. The Release workflow tests the
  packed tarballs and **stages** them on npm through trusted publishing (OIDC,
  with provenance). Nothing goes live until the maintainer approves each staged
  package with 2FA.

The changelog is written with [git-cliff](https://git-cliff.org), run by hand
(`cliff.toml`; not a dependency). It reads the squash-merged pull request titles,
which the PR title workflow holds to Conventional Commits.

## 0.1.0

On an up-to-date `main` with a clean working tree (the release PR merged):

1. Check the login and that both names are free:

   ```sh
   pnpm whoami                          # your npm user
   pnpm view deadhead                   # must fail with 404
   pnpm view eslint-plugin-deadhead     # must fail with 404
   ```

2. Build, check and pack. The smoke test installs the tarballs it writes to
   `tarballs/` into an empty project and uses them; those files are what you
   publish.

   ```sh
   pnpm install
   pnpm check:packages
   node scripts/smoke-packages.ts --out tarballs
   ```

3. Publish both tarballs (pnpm asks for 2FA on each):

   ```sh
   pnpm publish tarballs/deadhead-0.1.0.tgz --access public
   pnpm publish tarballs/eslint-plugin-deadhead-0.1.0.tgz --access public
   ```

4. Set up trusted publishing for every later release, on npmjs.com, for each
   package:
   - **Settings → Trusted publishing → GitHub Actions**: repository
     `cevdetta/deadhead`, workflow `release.yml`, environment `npm`, publishing
     mode **stage** (direct publishing off).
   - **Settings → Publishing access**: "Require two-factor authentication and
     disallow tokens".

5. Tag and push. The Release workflow runs the full chain, sees 0.1.0 already on
   npm and skips staging, then creates the GitHub Release from the changelog.

   ```sh
   git tag -s v0.1.0 -m v0.1.0
   git push origin v0.1.0
   ```

6. Check: both packages on npmjs.com, and in an empty directory
   `npx deadhead@0.1.0 --version` prints `0.1.0`.

From 0.1.0 on, rule ids are permanent: a rename goes through
`scripts/rename-rule.ts`, leaves a redirect, and its PR title carries `!`.

## Every later release

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
4. Approve, once per package, with 2FA:

   ```sh
   pnpm stage list
   pnpm stage view <stage-id>      # check name, version, file list
   pnpm stage approve <stage-id>
   ```

   `pnpm stage reject <stage-id>` drops a staged package instead.
5. Check both packages on npmjs.com (provenance shown, `latest` moved) and run
   `npx deadhead@X.Y.Z --version` in an empty directory.

The workflow runs in the GitHub environment `npm`, which the trusted publisher
checks. GitHub creates it on the first run; create it under Settings →
Environments only to add protection rules. Cloudflare Pages builds `main`, so the
rule pages match each release.
