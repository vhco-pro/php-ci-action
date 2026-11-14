# Configure PHP CI

The caller checks out its source with `fetch-depth: 0` and calls the action at an exact
reviewed commit. The [example workflow](../examples/standalone/ci.yml) uses the current draft
implementation. Update the ref deliberately after review and release.

The repository is currently private. Cross-repository execution requires approved GitHub Actions
access for the caller organization. That access-setting approval is pending. Source and local
integration testing continue independently.

## Project files

Commit `composer.json` and `composer.lock`. The development dependencies provide PHP_CodeSniffer,
PHPStan, PHPUnit and Psalm at versions compatible with the selected PHP runtime. The action runs
Composer validation, locked installation and real platform requirements checks. Composer plugins and
scripts are disabled during installation.

Commit the selected tools' configurations. The
[standalone fixture](../tests/fixture/) supplies a working example. Its Semgrep ignore file includes
owned tests in the scan. PHPStan and Psalm configurations should include the intended owned files and
accurate framework symbols. Psalm taint analysis needs framework-specific source, sink or sanitizer
annotations when native input wrappers hide a data flow. Check both a dangerous cross-function flow
and the safe form when extending those boundaries.

| Input | Use |
| --- | --- |
| `working-directory` | Existing project directory inside the caller checkout. Defaults to `.`. |
| `php-version` | Required exact patch from the action's declared matrix. |
| `extensions` | Additional comma-separated extension identifiers. The action also installs its tools' standard extensions. |
| `php-paths` | Newline-separated owned paths for syntax and complete Semgrep coverage. Defaults to `src` and `tests`. |
| `phpcs-config` | Coding standard, default `phpcs.xml.dist`. |
| `phpstan-config` | Type analysis, default `phpstan.neon`. |
| `phpunit-config` | Behavior tests, default `phpunit.xml.dist`. |
| `psalm-config` | Taint analysis, default `psalm.xml`. |
| `semgrep-config` | Required local PHP security rules file. |
| `gitleaks-config` | Optional custom secret rules and exclusions. The bundled default extends upstream rules and excludes installed vendor/node_modules files and Git metadata. |
| `secret-scan-base` | Optional full ancestor SHA. Empty scans complete HEAD ancestry. |

Configuration paths resolve inside the project. Source paths must contain PHP files, and discovered
source symlinks fail validation. The action checks that Semgrep actually covered every selected PHP
file. Findings, parser errors and missing coverage fail the check. Scanner suppressions and fixture
allowlists need a precise reason and review.

The output `php-version` records the resolved interpreter version. GitHub step results identify the
failed check. A failed check stops dependent publication jobs.

## Tools and updates

The consumer lock owns PHP checker versions. The action's
[tool manifest](../scripts/tools.yaml) owns its approved PHP patches, Composer and Gitleaks pins.
Semgrep and its transitive Python packages are hash-locked under `scripts/security/`.
The action installs scanners in an owned runner temporary directory.

The [Renovate configuration](../.github/renovate.json) makes the custom pins discoverable alongside
ordinary Composer, Bun and GitHub Actions dependencies. A Gitleaks update needs its independently
verified archive checksum in the same reviewed change. CI rejects a mismatching archive.

Runtime patch updates change the manifest, and the real CI matrix reads that manifest. Consumer pins
must then adopt the reviewed action revision and selected PHP patch. A runtime branch name alone
cannot establish that the current security fixes are present.

## Platform-specific consumers

Prepare platform symbols and protected fixtures in the consumer workflow before invoking the action.
Keep appliance lifecycle, native package audit, browser and full restore tests in consumer jobs.
Declare narrow exclusions for generated third-party trees or protected runtime evidence in the
consumer's Gitleaks configuration. Source and Git history scans still need meaningful coverage.

## Releases

The repository's [release workflow](../.github/workflows/release.yml) waits for the component tests
and calls the pinned `vhco-pro/gh-release-workflow`. That shared workflow calculates the version with
GitVersion's bundled configuration and publishes an exact `v`-prefixed semantic version when authorized.
PR executions run the same shared component in dry-run mode. Version calculation, tags and GitHub
Release publication stay with those shared components.
