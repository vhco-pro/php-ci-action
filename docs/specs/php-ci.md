---
status: draft
status_description: "Reviewed draft awaiting owner choices on v1 runners and security analysis."
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

The proposed v1 runtime matrix is PHP 8.4 and 8.5 on Ubuntu 24.04, subject to Q1. Require an exact
supported PHP patch version as `php-version`. Tool compatibility is verified against each selected
matrix runtime. The action provides these inputs.

| Input | Contract |
| --- | --- |
| `working-directory` | Defaults to `.`. An existing directory inside the caller checkout. Resolve it once and reject traversal or symlink escapes. |
| `php-version` | Required exact `major.minor.patch` version in a supported minor series. Reject branch/channel expressions. |
| `extensions` | Optional comma-separated PHP extension identifiers. Pass the parsed allowlisted identifiers to the selected runtime setup component. |
| `php-paths` | Newline-separated source/test directories relative to the working directory, defaulting to `src` and `tests`. Preserve spaces within a line. Require existing owned paths with at least one PHP file. |
| `phpcs-config` | Defaults to `phpcs.xml.dist`, an existing project-relative file. |
| `phpstan-config` | Defaults to `phpstan.neon`, an existing project-relative file. |
| `phpunit-config` | Defaults to `phpunit.xml.dist`, an existing project-relative file. |
| `security-config` | Required existing project-relative rules/config file for the security analyzer selected in Q2. |
| `gitleaks-config` | Optional existing project-relative configuration. An omitted value uses the pinned scanner's default rules. |
| `secret-scan-base` | Optional full commit SHA. When supplied it must exist and be an ancestor of HEAD. The Git scan covers `base..HEAD`. An omitted value scans HEAD's complete reachable ancestry. |

All path inputs resolve inside the consumer boundary. Pass values through environment variables or
argument vectors. Reject missing inputs, control characters and unsupported input syntax before tool
execution. The action exposes `php-version` with the actual interpreter's resolved version after setup.
Checks report status through their normal action steps and sanitized logs. No aggregate success output
is created for a failed run.

Use Composer's committed lock file to install the selected compatible PHP_CodeSniffer, PHPStan and
PHPUnit versions. Validate manifest/lock consistency and the actual interpreter/extensions. Reuse an
established equivalent analysis setup only through a documented tested interface. Source and test paths
come from the checked consumer configurations. Syntax checking covers every owned PHP entry point.

The source-security analyzer and secret scanner use free CLI implementations with compatible licenses
for use in this reusable action. Verify their actual PHP syntax support, selected rules, sources/sinks,
limits and finding/error exit behavior before adoption. Q2 selects the v1 analyzer, with Semgrep CE as the recommendation already exercised in the plugin.
The analyzer uses the required consumer `security-config`, with the tool installation and invocation
owned by the shared action. Gitleaks supplies secret scanning. Retain the selected tools, exact versions,
licenses and rule provenance in checked configuration. An included
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

Run source-security rules against `php-paths` and report parser or exclusion gaps. Run redacted secret
scanning over the declared Git range and the selected working tree, with project rules documenting
exclusions for dependencies and synthetic fixtures. Require complete Git ancestry when scanning full
history and sufficient history to resolve the selected base for a bounded scan. Reject an insufficient
checkout before claiming the range was scanned. Keep fixtures synthetic and exact allowlists reviewable. Scan checked source and
report the selected Git range and files. Retain sanitized results under a documented owned temporary
path. Keep report retention and upload under the caller's explicit workflow control.

Each required check's execution failure blocks the job. Every source-security and secret finding and
every Composer advisory or abandoned-package policy failure blocks by default. A consumer exception
requires an exact checked configuration entry with a reason and independent review. Empty rules, missing tools, parser failures, unreachable
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

### Q1: Which runner platforms should the first release support?

**Recommendation:** A. Start with Ubuntu 24.04 and PHP 8.4/8.5, including the actual plugin consumer.

| Option | You get | It costs |
| --- | --- | --- |
| **A. Linux first** | A tested Linux interface and both supported PHP minor series | macOS would need a later support decision |
| **B. Linux and macOS** | Both runner platforms in the first supported matrix | Additional tool-installation and scanner tests on macOS |

**Why this is yours:** The owner requested a shared action and free tools. The initial runner-platform
promise affects the supported consumer scope.

### Q2: Which free PHP security analyzer should the first release use?

**Recommendation:** A. Use Semgrep CE with pinned, reviewed PHP rules and explicit single-function limits.

| Option | You get | It costs |
| --- | --- | --- |
| **A. Semgrep CE** | Reuses the analyzer exercised by the plugin and consumer-owned rules | Rule selection and review, with single-function data-flow limits |
| **B. Psalm taint analysis** | PHP-specific analysis across function boundaries | Another Composer analyzer and framework source/sink configuration |

**Why this is yours:** Both meet the free-tool requirement and create different coverage and maintenance
commitments. The selected implementation becomes the first action's interface.

Public visibility and the first release remain later publication decisions.

## Review Log

| Date | Review | Kind | Commit | Model | Isolation | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-14 | R-1 | spec | `574ab52b016d810b3c9a28a9b2a741ffbad22ba9` | unknown | procedural | Interface and blocking policy clarified. Runner and analyzer choices await owner decisions. Model identity not attested. |

### R-1

FINDING: F-01
KIND: factual
SEVERITY: should-fix
WHERE: Design / Component and interface; Acceptance Criteria / AC-01, AC-03, AC-04; Test Plan
EVIDENCE: At 574ab52b016d810b3c9a28a9b2a741ffbad22ba9, docs/specs/php-ci.md lines 81-97 defer the input grammar, defaults, supported PHP versions and selected security implementation. Lines 112-120 refer to a declared scan range and finding policy without defining their inputs or default behavior. The test plan asserts runtime, outputs and documented inputs, while the design declares no output contract. Two implementations could expose incompatible interfaces, scan different Git ranges and apply different finding policies while satisfying the current criteria.
PROPOSAL: Define a small v1 input/output contract, supported runtime/runner boundary, default scan scope and blocking policy before acceptance. Name the selected security analyzer and its configuration ownership, or record the concrete selection decision in Open Questions.

FINDING: F-02
KIND: judgement
SEVERITY: should-fix
WHERE: Context / Owner summary; Open Questions
EVIDENCE: The Owner summary proposes Linux-only initial support, and Design allows a choice between Psalm and Semgrep CE. Open Questions says None while stating that the owner will review the proposed interface and Linux scope before acceptance. The pinned conventions/feature-documents.md Open questions section requires unsettled trade-offs to appear as owner questions and defines None as every question having been answered. The current owner instruction establishes a reusable VHCO action and free pipeline tooling, without choosing these additional boundaries.
PROPOSAL: Present the remaining consequential v1 scope and tool-selection choices in the required concise question format, with a recommendation and costs. Fold the owner's answers into the design before recording acceptance.

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
