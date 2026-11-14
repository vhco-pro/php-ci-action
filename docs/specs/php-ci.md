---
status: draft
status_description: "Shared PHP CI design awaiting independent review and owner acceptance."
issue: null
goal: "PHP consumers run reproducible blocking quality and security checks through one free-tool composite action."
covers:
  - action.yml
  - scripts/
  - tests/
  - examples/
  - .github/workflows/
  - composer.json
  - composer.lock
  - package.json
  - bun.lock
  - README.md
  - AGENTS.md
  - LICENSE
---

# Plan: Reusable PHP CI action

Provide `vhco-pro/php-ci-action` as the shared PHP verification component.

## Context

### Owner summary

The owner requested the same reusable component structure already used for Go and Worker CI.
This action will run PHP syntax, coding-standard, static-analysis, behavior, dependency-audit,
source-security and secret checks using free command-line tools. It will keep their versions,
configuration and actual coverage visible. Every required check must block CI on a finding or
execution failure according to its declared policy.

The first consumer is the native OPNsense encrypted Git backup plugin. Its own repository will keep
platform-symbol preparation, appliance package lifecycle, native restore, browser journeys and runtime
package audits. It will call the shared action at an immutable reviewed revision for generic PHP checks.
Other PHP projects will supply their own runtime, extensions and analysis configurations through the
same interface. The action's logic will live in versioned scripts called through `github.action_path`.

The proposed first target is Linux GitHub Actions runners. The caller checks out its source and sets
job permissions. The action sets up the requested PHP runtime and Composer, installs locked development
tools and executes the checks. The design uses local tool output and synthetic scanner fixtures.
Pipeline execution requires no paid scanner account or upload of private source to a scanning service.
The component will have its own CI, examples and independent review before consumer adoption.

The shared PHP guidance is merged at `1edeb5f32d868bbe761ef3221f350634cd6ff022`.
The action has no implementation or executed checks yet. Acceptance authorizes the feature claim,
implementation, tests and reviewable PR in this repository. Implementation merge, public visibility,
version tags and release remain separate owner decisions. The plugin can execute its scans while this
component is developed. Its correctness and scan evidence remain required before its own completion.

### Background

On 2026-11-14 the parent inspected the plugin's committed `.github/workflows/php.yml`. It ran syntax,
PHP_CodeSniffer PSR-12, PHPStan and PHPUnit, while the owner requested actual dependency, source-security
and secret scanning and a reusable VHCO CI action. Shared Docs PR #38 introduced the explicit security
coverage and was merged with the owner's approval.

The Go action uses `runs.using: composite`, explicit inputs and blocking commands. The Worker action
calls its own `scripts/verify.ts` through `github.action_path`. Both component revisions are listed
under Sources. Shared coding and delivery guidance require small orchestration, checked examples,
immutable pins and one owning component per responsibility.

## Scope

Include the generic PHP quality/security composite, reproducible tool setup, Linux runner verification,
passing and failing synthetic consumers, checked usage examples and documentation. Keep native platform
setup, application-specific integration and deployment in consumers. Release workflows compose the CI
component with the existing shared versioning/release components when separately approved.

## Design

### Component and interface

Use one repository named `php-ci-action`, Apache-2.0 under VH & Co BV, with `action.yml` as a composite.
The caller supplies checkout and read-only job permissions. The action executes from the consumer's
selected working directory, resolves its own scripts from `github.action_path` and supports running
from a nested directory in a separate checkout. The caller's credentials remain outside diagnostics.

Expose an explicit supported PHP version, required extensions, working directory and the paths of the
consumer's coding-standard, static-analysis, unit-test and source-security configurations. Keep defaults
consistent with the shared PHP conventions. Document the exact accepted input grammar and reject unsafe
or missing inputs. Pass input values through environment variables or argument vectors.

Use Composer's committed lock file to install the selected compatible PHP_CodeSniffer, PHPStan and
PHPUnit versions. Validate manifest/lock consistency and the actual interpreter/extensions. Reuse an
established equivalent analysis setup only through a documented tested interface. Source and test paths
come from the checked consumer configurations. Syntax checking covers every owned PHP entry point.

The source-security analyzer and secret scanner use free CLI implementations with compatible licenses
for use in this reusable action. Verify their actual PHP syntax support, selected rules, sources/sinks,
limits and finding/error exit behavior before adoption. A compatible Psalm taint-analysis setup or
Semgrep CE setup satisfies the source-security role when its configured coverage is proved. Gitleaks
can satisfy the secret-scanning role. Select one source-security implementation for v1 and retain that
choice, exact versions, licenses and rule provenance in its own checked tool configuration. An included
ruleset needs its own license and attribution assessment.

Keep tool pins in manifests read by the configured updater or its explicit custom manager. Install from
lock files or exact verified downloads. Configure no paid account requirement. Keep generic checked tool
settings with their owner and project-specific rules with the consumer. No scanner auto-discovery may
silently replace the selected rules. Browser and package developer tools stay outside deployed artifacts.

### Checks and results

Run syntax checks with the selected PHP interpreter, coding-standard checks in check mode, PHPStan at
the consumer's declared level with real host symbols or precise stubs, and PHPUnit behavior tests.
Run `composer audit --locked` including development and transitive dependencies. Keep package-policy
findings visible with their reviewed dispositions. The consumer's native package manager audits runtime
dependencies outside Composer.

Run source-security rules against the intended owned PHP files. Run redacted secret scanning over the
declared checkout/history range. Document history requirements and detect an insufficient checkout for
the selected range. Keep fixtures synthetic and exact allowlists reviewable. Scan checked source and
report the selected Git range and files. Retain sanitized results under a documented owned temporary
path. Keep report retention and upload under the caller's explicit workflow control.

Each required check's execution failure blocks the job. Findings fail according to the declared policy,
with narrow independently reviewed exceptions. Empty rules, missing tools, parser failures, unreachable
advisory services and unexpectedly empty owned-file coverage produce failed or incomplete verification.
A scanner's zero exit alone cannot establish its expected coverage. Verify a known synthetic positive
and clean negative when introducing the scanner and pin its relevant flags.

### Consumer and release adoption

Keep substantial logic in ordinary scripts with focused tests. Preserve the native plugin's repository
configuration and platform preparation. Its CI calls a reviewed immutable action commit with its tested
inputs and retains native integration jobs. Prove one additional ordinary standalone PHP consumer so the
action does not depend on OPNsense paths or symbols.

Maintain complete examples under `examples/` and validate them against the action's actual inputs.
The README gives a short overview and links details. Record action tool versions, config paths and
results for the first real consumer. A private design repository becomes publicly callable only after
the owner approves public visibility and its first release. Before that approval, isolated tests may
use a local composite checkout. Prepare the normal shared release composition and exact semantic version
pins for review, keeping CI verification and publication authority distinct.

## Acceptance Criteria

- [ ] AC-01: A Linux workflow invokes the composite from a separately checked-out action and a nested PHP consumer with documented inputs, correct runtime/extensions and no accidental writes outside owned setup/output paths.
- [ ] AC-02: Syntax, coding-standard, static-analysis and behavior checks each execute against the intended owned files, accept a valid fixture and independently reject an appropriate defective fixture.
- [ ] AC-03: Locked dependency auditing, PHP source-security analysis and redacted secret scanning execute with recorded versions, licenses, rules and coverage, using free tools without a required paid scanning account.
- [ ] AC-04: The pipeline blocks on scanner findings and execution failures, including synthetic vulnerabilities or secrets, malformed configuration, empty expected coverage, missing tools and unavailable audit data, while narrow reviewed exceptions remain visible.
- [ ] AC-05: Tool setup and action dependencies are immutable, verified and discoverable by the repository's updater, and scripts, lock files, workflow permissions and diagnostics preserve the declared input and credential boundaries.
- [ ] AC-06: A standalone PHP fixture and the OPNsense plugin demonstrate the same generic action interface, with native OPNsense tests retained in the plugin and complete checked examples and operator documentation.
- [ ] AC-07: Independent review and exact-head CI establish the accepted component and first-consumer behavior, while publication state and any pending cross-repository adoption remain explicit.

## Test Plan

| Criterion | Proof |
| --- | --- |
| AC-01 | Run the actual composite in its GitHub integration workflow with the action and consumer in different directories, including a directory containing spaces. Assert runtime/extensions, outputs and unchanged fixture source. Reject paths outside the documented consumer boundary and command-substitution input without executing it. |
| AC-02 | Exercise actual action scripts/commands against isolated passing fixtures and separate invalid syntax, PSR-12 style, type/API and failing PHPUnit cases. Assert the relevant command fails on each fixture and prove it scans the declared paths. |
| AC-03 | Record each installed tool/version/license and selected configuration, then run audit, source-security and secret checks against clean and finding-bearing synthetic inputs. Verify the scan needs no paid-service credential. Prove known input-to-sensitive-operation coverage for the selected PHP scanner and list its limits. |
| AC-04 | Fault-inject scanner startup errors, invalid rules, parser errors, empty owned paths and advisory-service failures through controlled fixtures. Assert a failed/incomplete job outcome and redacted output. Verify a narrowly scoped allowed fixture leaves an independent synthetic finding detectable. |
| AC-05 | Inspect manifests and updater configuration against every installed dependency and rule pin. Verify an incorrect checksum fails setup, and use hostile path/configuration inputs to confirm argument handling. Inspect workflow permissions, reports and Git diff for leaked fixtures or source mutation. |
| AC-06 | Run the real composite on a standalone fixture and the plugin's reviewed source/configuration with host symbols prepared by the consumer. Validate example workflow input names and required values against action.yml. Confirm the plugin's native browser/package/restore jobs remain present and their evidence stays consumer-owned. |
| AC-07 | Run repository checks and the real GitHub composite workflow at the PR head, retain the independent review and verify that the proposed plugin pin names the assessed component commit. Record any unapproved publication or merge as pending. |

## Tasks

None yet. Tasks follow reviewed owner acceptance.

## Open Questions

None. The owner will review the proposed v1 interface and Linux scope before acceptance. Public visibility
and the first release remain later publication decisions.

## Review Log

| Date | Review | Kind | Commit | Model | Isolation | Outcome |
| --- | --- | --- | --- | --- | --- | --- |

## Sources

- [Merged PHP security guidance](https://github.com/vhco-pro/docs/commit/1edeb5f32d868bbe761ef3221f350634cd6ff022) supplies the adopted coding, delivery and scan requirements.
- [Go CI composite](https://github.com/michielvha/go-ci-action/blob/ab14d6420148179e8d20ecc0b7cb89760193cb37/action.yml) establishes the existing language-check component pattern.
- [Worker CI composite](https://github.com/vhco-pro/worker-ci-action/blob/5ef3cf6b375c6247a28fffb7c19b8d6c5aae97c3/action.yml) establishes the existing action-owned script pattern.
- [Plugin CI at the inspected initial PR head](https://github.com/vhco-pro/opnsense-encrypted-git-backup/blob/75db0edec1f0ce1f3cc23d50919531ac8cabd274/.github/workflows/php.yml) provides the first consumer's starting check arrangement.
- [Composer audit](https://getcomposer.org/doc/03-cli.md#audit) documents locked-package dependency auditing.
- [PHPStan levels](https://phpstan.org/user-guide/rule-levels) documents declared type-analysis coverage.
- [Psalm security analysis](https://psalm.dev/docs/security_analysis/) documents PHP taint analysis.
- [Semgrep CE language support](https://docs.semgrep.dev/semgrep-ce-languages) documents free-engine PHP coverage and limits.
- [Gitleaks](https://github.com/gitleaks/gitleaks) documents local redacted secret scanning.
