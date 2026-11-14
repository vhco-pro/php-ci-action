---
status: in-progress
branch: feat/php-ci
status_description: "Clean spec review and owner authorization recorded for implementation, pushes and CI; merges await review."
issue: https://github.com/vhco-pro/php-ci-action/issues/1
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
  - tsconfig.json
  - eslint.config.mjs
  - .gitignore
  - bun.lock
  - README.md
  - docs/usage.md
  - AGENTS.md
  - LICENSE
---

# Plan: Reusable PHP CI action

Provide `vhco-pro/php-ci-action` as the shared PHP verification component.

## Context

### Owner summary

The owner requested the same reusable component structure already used for Go and Worker CI.
This action will run PHP syntax, coding-standard, static-analysis, behavior, dependency-audit,
Semgrep security, Psalm taint and secret checks using free command-line tools. It will keep their versions,
configuration and actual coverage visible. Every required check must block CI on a finding or
execution failure according to its declared policy.

The first consumer is the native OPNsense encrypted Git backup plugin. Its own repository will keep
platform-symbol preparation, appliance package lifecycle, native restore, browser journeys and runtime
package audits. It will call the shared action at an immutable reviewed revision for generic PHP checks.
Other PHP projects will supply their own runtime, extensions and analysis configurations through the
same interface. The action's logic will live in versioned scripts called through `github.action_path`.

The owner selected Linux GitHub Actions runners. The caller checks out its source and sets
job permissions. The action sets up the requested PHP runtime and Composer, installs locked development
tools and executes the checks. The design uses local tool output and synthetic scanner fixtures.
Pipeline execution requires no paid scanner account or upload of private source to a scanning service.
The component will have its own CI, examples and independent review before consumer adoption. The owner explicitly authorized branch pushes and CI,
with all implementation merges held for review.

The shared PHP guidance is merged at `1edeb5f32d868bbe761ef3221f350634cd6ff022`.
The action is implemented on its feature branch. Its Linux composites, defective fixtures and shared
GitVersion dry run passed on both selected patches at `8bed7b3`. Independent review found secret-scan
and empty-check coverage defects that require repair. Native first-consumer adoption remains pending. Acceptance authorizes the feature claim,
implementation, tests and reviewable PR in this repository. Implementation merge, public visibility,
version tags and release remain separate owner decisions. The plugin can execute its scans while this
component is developed. Its correctness and scan evidence remain required before its own completion. Shared GitVersion controls both this action and the plugin release versions.
The plugin owns its native SemVer-to-pkg mapping and signed-feed version proof.

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

Include the generic PHP quality/security composite, reproducible tool setup, Linux runner verification, shared GitVersion dry-run/release wiring,
passing and failing synthetic consumers, checked usage examples and documentation. Keep native platform
setup, application-specific integration and deployment in consumers. Release workflows compose the checked CI component with the existing shared GitVersion release workflow.
Source inspection verified `vhco-pro/gh-release-workflow/.github/workflows/gh-release.yml` at
`b18de6d2f305f971afe01ba31e17bde5966b1567`. It calls the shared GitVersion action and shared release action.
The component uses its bundled GitVersion configuration and exact v-prefixed SemVer tags. The caller
orders tests before the shared workflow. Feature-branch verification runs dry-run only. Actual release
publication remains separately approved.

## Design

### Component and interface

Use one repository named `php-ci-action`, Apache-2.0 under VH & Co BV, with `action.yml` as a composite.
The caller supplies checkout and read-only job permissions. The action executes from the consumer's
selected working directory, resolves its own scripts from `github.action_path` and supports running
from a nested directory in a separate checkout. The caller's credentials remain outside diagnostics.

The v1 runtime matrix is PHP 8.4.27 and 8.5.12 on Ubuntu 24.04. These are the currently published
security-fixed releases on the selected active branches. Require an exact supported patch version as
`php-version` and reject older patches, prereleases and other branches. Store the approved patch matrix
in updater-visible configuration and verify the resolved interpreter against it. Tool compatibility is verified against each selected
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
| `semgrep-config` | Required existing project-relative PHP security rules file. |
| `psalm-config` | Defaults to `psalm.xml`, an existing project-relative taint-analysis configuration. |
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
come from the checked consumer configurations. All four Composer-managed tools, including Psalm,
are pinned in the consumer lock file and compatibility-checked on the selected PHP runtime. Syntax checking covers every owned PHP entry point.

The source-security analyzers and secret scanner use free CLI implementations with compatible licenses
for use in this reusable action. Verify their actual PHP syntax support, selected rules, sources/sinks,
limits and finding/error exit behavior before adoption. The owner selected Semgrep CE and requested Psalm for its complementary cross-function taint analysis.
Run both. Semgrep uses consumer `semgrep-config`; Psalm uses `psalm-config` and accurate framework
source/sink/sanitizer annotations when needed. The shared action owns tool setup and invocation.
Verify a cross-function unsafe flow fails Psalm and a corresponding safe flow passes. Keep ordinary
type analysis with PHPStan and report each analyzer's actual limits. Gitleaks supplies secret scanning. Retain the selected tools, exact versions,
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

Run Semgrep rules and Psalm taint analysis against the intended owned paths declared by their checked configurations.
Verify Semgrep coverage against `php-paths` and report parser or exclusion gaps. Run redacted secret
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
  Evidence: R-4 returned not verified at `8bed7b3`; its recorded proof requires follow-up.
- [ ] AC-02: Syntax, coding-standard, static-analysis and behavior checks each execute against the intended owned files, accept a valid fixture and independently reject an appropriate defective fixture.
- [ ] AC-03: Locked dependency auditing, Semgrep security analysis, Psalm taint analysis and redacted secret scanning execute with recorded versions, licenses, rules and coverage, using free tools without a required paid scanning account.
- [ ] AC-04: The pipeline blocks on scanner findings and execution failures, including synthetic vulnerabilities or secrets, malformed configuration, empty expected coverage, missing tools and unavailable audit data, while narrow reviewed exceptions remain visible.
  Evidence: R-4 returned not met at `8bed7b3`; its recorded proof requires follow-up.
- [ ] AC-05: Tool setup and action dependencies are immutable, verified and discoverable by the repository's updater, and scripts, lock files, workflow permissions and diagnostics preserve the declared input and credential boundaries.
- [ ] AC-06: A standalone PHP fixture and the OPNsense plugin demonstrate the same generic action interface, with native OPNsense tests retained in the plugin and complete checked examples and operator documentation.
  Evidence: R-4 returned untested at `8bed7b3`; its recorded proof requires follow-up.
- [ ] AC-07: Independent review and exact-head CI establish the accepted component and first-consumer behavior, while publication state and any pending cross-repository adoption remain explicit.
  Evidence: R-4 returned not met at `8bed7b3`; its recorded proof requires follow-up.
- [ ] AC-08: Release verification runs only after the component checks, obtains its version through the pinned shared GitVersion release workflow and uses its bundled policy, with dry runs creating no tags or releases.

## Test Plan

| Criterion | Proof |
| --- | --- |
| AC-01 | Run the actual composite in its GitHub integration workflow with the action and consumer in different directories, including a directory containing spaces. Assert runtime/extensions, outputs and unchanged fixture source. Reject paths outside the documented consumer boundary and command-substitution input without executing it. |
| AC-02 | Exercise actual action scripts/commands against isolated passing fixtures and separate invalid syntax, PSR-12 style, type/API and failing PHPUnit cases. Assert the relevant command fails on each fixture and prove it scans the declared paths. |
| AC-03 | Record each installed tool/version/license and selected configuration, then run Composer audit, Semgrep, Psalm and secret checks against clean and finding-bearing synthetic inputs. Verify the scan needs no paid-service credential. Prove Semgrep positive/negative cases and a cross-function input-to-sensitive-operation flow in Psalm, and list both analyzers' limits. |
| AC-04 | Fault-inject scanner startup errors, invalid rules, parser errors, empty owned paths and advisory-service failures through controlled fixtures. Assert a failed/incomplete job outcome and redacted output. The Psalm coverage guard must accept an analyzed source with No errors found and reject an exit-zero No files analyzed line. PHPUnit must fail its empty suite. A nested owned src/vendor secret and a removed historical secret must both fail. Verify a narrowly scoped allowed fixture leaves an independent synthetic finding detectable. |
| AC-05 | Inspect manifests and updater configuration against every installed dependency and rule pin. Verify an incorrect checksum fails setup, and use hostile path/configuration inputs to confirm argument handling. Inspect workflow permissions, reports and Git diff for leaked fixtures or source mutation. |
| AC-06 | Run the real composite on a standalone fixture and the plugin's reviewed source/configuration with host symbols prepared by the consumer. Validate example workflow input names and required values against action.yml. Confirm the plugin's native browser/package/restore jobs remain present and their evidence stays consumer-owned. |
| AC-07 | Run repository checks and the real GitHub composite workflow at the PR head, retain the independent review and verify that the proposed plugin pin names the assessed component commit. Record any unapproved publication or merge as pending. |
| AC-08 | Inspect and test workflow dependency/pin/permissions against the actual shared release contract. Run its dry-run path at the assessed commit and verify that version output is from GitVersion while tags/releases remain unchanged. Reject local version calculators, duplicate release owners and a release job independent of checks. |

## Tasks

- [x] T1 `tests/ci.test.ts`, `tests/fixture/` - observe failures for absent input validation, checker dispatch, scanner outcomes and shared release wiring (AC-01, AC-02, AC-03, AC-04, AC-08)
  - Evidence: `bun test tests/ci.test.ts` failed on the absent `scripts/ci` module. Baseline output is retained at `/tmp/php-ci-t1-baseline-20261114.log`.
- [x] T2 `action.yml`, `scripts/`, `package.json` - pass the input and command contract tests with patched runtime setup and all required checks (AC-01, AC-02, AC-03, AC-04, AC-05)
  - Evidence: strict TypeScript checks, typed ESLint and all 17 input/checker unit contracts passed. The release-composition contract remains the T3 verification. Compiler 6.0.3 satisfies typescript-eslint's declared supported range.
- [x] T3 `.github/workflows/`, `.github/renovate.json`, `examples/` - run real Linux composite fixtures on both patched runtimes, prove updater discovery and run shared GitVersion dry-run after checks (AC-01, AC-02, AC-03, AC-04, AC-05, AC-08)
  - Evidence: GitHub run https://github.com/vhco-pro/php-ci-action/actions/runs/43582433477 passed the actual composite on PHP 8.4.27 and 8.5.12, defective checker fixtures and the shared GitVersion dry run at `2c05821`. Earlier manifest, CLI and nested-scan failures remain in previous runs.
- [ ] T4 `README.md`, `AGENTS.md`, `tests/` - record native consumer inputs, compatibility and failure evidence and verify examples match the composite (AC-06, AC-07)
- [ ] T5 `docs/specs/php-ci.md` - obtain independent implementation review, repair findings and push the reviewed PR with exact-head CI (AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08)

- [ ] T6 `scripts/ci.ts`, `tests/ci.test.ts`, `tests/probe.ts` - reject nested-source secret omissions and empty PHPUnit/Psalm coverage, retain sanitized Semgrep failure details and pass real regression probes (AC-03, AC-04, AC-05)
- [ ] T7 `.github/workflows/test.yml`, `tests/probe.ts` - verify the actual composite from a consumer directory containing spaces and prove its checked inputs remain unchanged (AC-01)

## Open Questions

None. On 2026-11-14 the owner selected Linux only, Semgrep CE, added Psalm when useful and free,
authorized automatic merged-branch deletion and requested continued implementation with pushes and CI.
The owner required patched versions on the used PHP branches and shared GitVersion for both components.
The current patch matrix is 8.4.27 and 8.5.12, verified against PHP's release notices. The OPNsense plugin
continues to target its own PHP 8.5 platform. Implementation merge, public visibility and release remain
separate owner decisions.

## Review Log

| Date | Review | Kind | Commit | Model | Isolation | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-14 | R-1 | spec | `574ab52b016d810b3c9a28a9b2a741ffbad22ba9` | unknown | procedural | Interface and blocking policy clarified. Runner and analyzer choices await owner decisions. Model identity not attested. |
| 2026-11-14 | R-2 | spec | `2d9c3ae1fb0cc02810499c78474d45d0161c57d1` | unknown | procedural | NO FINDINGS. Model identity not attested. |
| 2026-11-14 | R-2 | spec | `2d9c3ae1fb0cc02810499c78474d45d0161c57d1` | n/a | n/a | accepted by owner |
| 2026-11-14 | R-3 | spec | `8bed7b357d3849a92d6c7c1ceb816561983eaf1b` | unknown | procedural | One summary-only nit. Model identity not attested. |
| 2026-11-14 | R-3 | spec | `8bed7b357d3849a92d6c7c1ceb816561983eaf1b` | n/a | n/a | accepted by owner |
| 2026-11-14 | R-4 | implementation | `8bed7b357d3849a92d6c7c1ceb816561983eaf1b` | unknown | procedural | Blocking secret and empty-check coverage defects. First-consumer proof pending. Model identity not attested. |

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

### R-2

NO FINDINGS

### R-3

FINDING: F-01
KIND: factual
SEVERITY: nit
WHERE: Context / Owner summary
EVIDENCE: At 8bed7b357d3849a92d6c7c1ceb816561983eaf1b, docs/specs/php-ci.md line 54 still says the action has no implementation or executed checks. The same commit contains action.yml, scripts/ci.ts, tests and integration workflows. Task T3 records GitHub run 43582433477, whose read-only API response confirms success at 2c058210653ff167e37858696ebfd947c43f004b. This stale summary survived the revision that added implementation task evidence.
PROPOSAL: Refresh the owner summary with the observed implementation and earlier CI results, naming the current-head verification and first-consumer or independent-review work that remains pending.

### R-4

CRITERION: AC-01 A Linux workflow invokes the composite from a separately checked-out action and a nested PHP consumer with documented inputs, correct runtime/extensions and no accidental writes outside owned setup/output paths.
VERDICT: not verified
EVIDENCE: At 8bed7b357d3849a92d6c7c1ceb816561983eaf1b, GitHub run https://github.com/vhco-pro/php-ci-action/actions/runs/43583160878 passed the actual nested composite on PHP 8.4.27 and 8.5.12. Local validation tests passed for paths containing spaces and rejected traversal and symlink escapes. The Test Plan's actual composite execution from a directory containing spaces and unchanged-fixture assertion are absent from the integration workflow, so those parts remain unverified.

CRITERION: AC-02 Syntax, coding-standard, static-analysis and behavior checks each execute against the intended owned files, accept a valid fixture and independently reject an appropriate defective fixture.
VERDICT: met
EVIDENCE: At 8bed7b357d3849a92d6c7c1ceb816561983eaf1b, the actual GitHub composite passed the standalone source and tests on both declared PHP runtimes. I inspected run 43583160878 and observed the defective fixtures fail with PHP syntax, PHP_CodeSniffer style, PHPStan return-type and PHPUnit assertion diagnostics. Local bun run check also passed strict TypeScript checks, typed ESLint and 20 tests.

CRITERION: AC-03 Locked dependency auditing, Semgrep security analysis, Psalm taint analysis and redacted secret scanning execute with recorded versions, licenses, rules and coverage, using free tools without a required paid scanning account.
VERDICT: met
EVIDENCE: At 8bed7b357d3849a92d6c7c1ceb816561983eaf1b, run 43583160878 executed Composer audit, Semgrep CE, Psalm taint analysis and Gitleaks on both runtimes. The run recorded successful dependency auditing, two-file Semgrep coverage, Psalm analysis and redacted Git history/tree scans. The positive probes exercised cross-function Psalm taint, the escaped filesystem-path Semgrep rule and a synthetic secret. Tool manifests, the hash-locked Python requirements and Composer lock record versions. The four Composer checkers declare MIT or BSD licences, and these command paths require no paid scanner account.

CRITERION: AC-04 The pipeline blocks on scanner findings and execution failures, including synthetic vulnerabilities or secrets, malformed configuration, empty expected coverage, missing tools and unavailable audit data, while narrow reviewed exceptions remain visible.
VERDICT: not met
EVIDENCE: At 8bed7b357d3849a92d6c7c1ceb816561983eaf1b, I executed the actual check('secrets') function against isolated fixtures using checksum-verified Gitleaks 8.21.2. validate() selected both synthetic Secret.php files as owned source. The token under src/application failed the check, while the identical token under src/vendor passed because of the bundled allowlist. I also executed the locked PHPUnit and Psalm commands against empty configurations in owned containers. PHPUnit returned exit 0 with No tests executed, and Psalm returned exit 0 with No files analyzed. The wrapper accepted those exit statuses.

CRITERION: AC-05 Tool setup and action dependencies are immutable, verified and discoverable by the repository's updater, and scripts, lock files, workflow permissions and diagnostics preserve the declared input and credential boundaries.
VERDICT: met
EVIDENCE: At 8bed7b357d3849a92d6c7c1ceb816561983eaf1b, source inspection and the real CI run established SHA-pinned setup/release actions, the approved PHP matrix, exact Composer identity, locked consumer tools, hash-required Semgrep installation and checksum-verified Gitleaks download. The archive-integrity test rejected changed bytes. I executed the custom-manager expressions and observed extraction of both PHP versions, Composer and Gitleaks from scripts/tools.yaml. Local hostile-input tests passed, and the real secret probe used full redaction. Source, index and refs remained unchanged throughout this review. Live updater scheduling was not assessed.

CRITERION: AC-06 A standalone PHP fixture and the OPNsense plugin demonstrate the same generic action interface, with native OPNsense tests retained in the plugin and complete checked examples and operator documentation.
VERDICT: untested
EVIDENCE: At 8bed7b357d3849a92d6c7c1ceb816561983eaf1b, the standalone composite and example-input checks passed, and usage documentation is present. The owning feature and dispatch identify native plugin adoption as pending. No executed OPNsense consumer invocation of this assessed action commit was established in this review.

CRITERION: AC-07 Independent review and exact-head CI establish the accepted component and first-consumer behavior, while publication state and any pending cross-repository adoption remain explicit.
VERDICT: not met
EVIDENCE: Exact-head run 43583160878 passed all component jobs at 8bed7b357d3849a92d6c7c1ceb816561983eaf1b. This independent review reproduced the security-coverage and empty-check defects recorded below. The native first-consumer proof remains pending. The repository and draft PR identify their in-progress publication state.

CRITERION: AC-08 Release verification runs only after the component checks, obtains its version through the pinned shared GitVersion release workflow and uses its bundled policy, with dry runs creating no tags or releases.
VERDICT: met
EVIDENCE: At 8bed7b357d3849a92d6c7c1ceb816561983eaf1b, .github/workflows/release.yml orders the pinned shared gh-release-workflow after the reusable test workflow. Run 43583160878 passed that shared release job with dry-run true after both composite jobs and script checks. Its logs show the shared GitVersion calculation. GitHub API queries returned zero tags and zero releases. No local version calculator or GitVersion policy override is present.

FINDING: F-01
KIND: factual
SEVERITY: blocking
WHERE: scripts/security/gitleaks.toml:7; scripts/ci.ts:136-138; docs/usage.md:36; Design / Checks and results
EVIDENCE: The bundled allowlist excludes every vendor and node_modules directory at any depth. In isolated fixtures at the assessed commit, validate() explicitly selected src/application/Secret.php and src/vendor/Secret.php as owned PHP files. The actual check('secrets') rejected the first synthetic token and accepted the identical token in the second file. Pinned upstream Gitleaks defaults detected the nested-vendor token when the bundled configuration was omitted. Evidence is retained in /tmp/php-ci-review.U52S0I/component-proof.log and upstream-nested-vendor.log. This suppresses selected application source through an exclusion documented for installed dependencies.
PROPOSAL: Remove or narrow the blanket dependency exclusions so explicitly selected owned source remains scanned. Add a real nested-vendor secret regression and verify both working-tree and history coverage.

FINDING: F-02
KIND: factual
SEVERITY: should-fix
WHERE: scripts/ci.ts:94-101; scripts/ci.ts:117-126; tests/probe.ts:35-41; Design / Checks and results
EVIDENCE: Semgrep runs through requireSuccess with silent=true. A real finding or scanner error produces a nonzero exit and throws before check() parses its JSON. Consequently the reporting branch executes only for a successful command, and real failures expose only semgrep failed with exit N. The CI positive probe demonstrates this generic message without a rule, file or location. No sanitized result file is retained, despite the design requiring retained sanitized results and visible findings.
PROPOSAL: Parse and summarize Semgrep findings and errors before propagating its failed outcome. Preserve safe rule, relative path, location and error-category information while excluding source snippets and secret values, and add finding/error diagnostics tests.

FINDING: F-03
KIND: factual
SEVERITY: blocking
WHERE: scripts/ci.ts:100; scripts/ci.ts:113-114; tests/probe.ts:8-16; Design / Checks and results
EVIDENCE: The PHPUnit and Psalm branches rely solely on exit status. I ran PHPUnit 13.4.7 on PHP 8.5.12 with an existing empty suite using the action's current flags. It returned exit 0 and No tests executed. Psalm 7.5.0 with the current taint-analysis flags and an existing empty project directory returned exit 0, No errors found and No files analyzed. The current wrapper therefore accepts required checks with zero executed coverage. Evidence is retained in /tmp/php-ci-review.U52S0I/phpunit-empty.log and psalm-empty.log.
PROPOSAL: Enable PHPUnit's empty-suite failure and reject Psalm's zero-file analysis result. Add empty-suite and empty-analysis regressions alongside the existing positive and unsafe fixtures.

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

- [PHP support policy](https://www.php.net/supported-versions.php) and [PHP release changelog](https://www.php.net/ChangeLog-8.php) establish the selected active branches and current security-fixed patches.
- [Shared GitVersion release workflow](https://github.com/vhco-pro/gh-release-workflow/blob/b18de6d2f305f971afe01ba31e17bde5966b1567/.github/workflows/gh-release.yml) owns component version calculation and release publication.
- [Psalm MIT license](https://github.com/vimeo/psalm/blob/master/LICENSE) permits the selected free analyzer.
