# PHP CI action

Run PHP syntax, coding-standard, type and behavior checks, Psalm taint analysis,
Composer auditing, Semgrep CE and redacted secret scans through one composite action.

The action supports Linux x64 and the [declared patched PHP versions](scripts/tools.yaml).
Its command-line tools run locally in the job with free licences. The current implementation
is under review in [PR #2](https://github.com/vhco-pro/php-ci-action/pull/2).

## Use it

Start with the [complete workflow](examples/standalone/ci.yml) and the
[configuration guide](docs/usage.md). The consumer supplies a Composer lock file and checked
PHP_CodeSniffer, PHPStan, PHPUnit, Psalm and Semgrep configurations.

Native OPNsense symbols, appliance tests, package building and restoration remain in the plugin.
This repository's release workflow invokes shared GitVersion after its checks pass.

## Development

Run `bun install --frozen-lockfile`, then `bun run check`.
GitHub CI also runs the actual composite and defective fixtures on both declared PHP runtimes,
followed by the shared GitVersion dry run.

The [feature document](docs/specs/php-ci.md) records acceptance and verification.
