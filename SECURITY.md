# Security

## Supported versions

Security fixes target the latest stable releases of `deadhead` and
`eslint-plugin-deadhead`. Please check whether a finding still occurs with the
latest release when possible; older releases do not receive separate backports.

## Reporting a vulnerability

For sensitive findings, use [GitHub private vulnerability reporting](https://github.com/cevdetch/deadhead/security/advisories/new).
If GitHub does not show a **Report a vulnerability** button, open an issue asking
for a private reporting channel without including the vulnerability details.

Include the affected package and version, a minimal reproduction, the expected
impact, and whether the problem occurs with the latest release. Reports about
the CLI, ESLint plugin, browser tools, build pipeline, or dependencies are welcome.

Use the bug-report form for incorrect lint findings and documentation corrections
that do not expose a security vulnerability.

## Coordinated disclosure

Keep vulnerability details private while the maintainer investigates and prepares
a fix. The maintainer will coordinate disclosure with the reporter and publish
an advisory with affected versions and remediation when the fix is available.
