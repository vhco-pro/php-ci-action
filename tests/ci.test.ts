import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate, check, supportedVersions, type CommandRunner } from "../scripts/ci";

let workspace: string;
let environment: Record<string, string>;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "php-ci fixture "));
  const project = join(workspace, "nested project");
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "tests"));
  writeFileSync(join(project, "src/example.php"), "<?php\nfunction answer(): int { return 42; }\n");
  writeFileSync(join(project, "tests/example.php"), "<?php\nassert(answer() === 42);\n");
  for (const file of ["composer.json", "composer.lock", "phpcs.xml.dist", "phpstan.neon", "phpunit.xml.dist", "psalm.xml", "security.yml"]) {
    writeFileSync(join(project, file), "{}\n");
  }
  environment = {
    GITHUB_WORKSPACE: workspace,
    INPUT_PROJECT: "nested project",
    INPUT_PHP: supportedVersions()[1],
    INPUT_EXTENSIONS: "mbstring, dom",
    INPUT_PATHS: "src\ntests",
    INPUT_PHPCS: "phpcs.xml.dist",
    INPUT_PHPSTAN: "phpstan.neon",
    INPUT_PHPUNIT: "phpunit.xml.dist",
    INPUT_PSALM: "psalm.xml",
    INPUT_SEMGREP: "security.yml",
  };
});

afterEach(() => rmSync(workspace, { recursive: true, force: true }));

test("validates a nested project with spaces and exact patched PHP", () => {
  const config = validate(environment);
  expect(config.project).toBe(join(workspace, "nested project"));
  expect(config.phpVersion).toBe(supportedVersions()[1]);
  expect(config.phpFiles).toHaveLength(2);
  expect(config.extensions).toContain("dom");
});

test.each(["8.4", "8.5.8", "8.3.30", "8.6.0RC7", "8.5.12\nanything", "$(touch hacked)"])("rejects unsupported runtime %s", version => {
  expect(() => validate({ ...environment, INPUT_PHP: version })).toThrow();
});

test("rejects project traversal and symlink escapes", () => {
  expect(() => validate({ ...environment, INPUT_PROJECT: ".." })).toThrow();
  symlinkSync(tmpdir(), join(workspace, "escape"));
  expect(() => validate({ ...environment, INPUT_PROJECT: "escape" })).toThrow();
  symlinkSync(tmpdir(), join(workspace, "nested project", "src", "escape"));
  expect(() => validate(environment)).toThrow();
});

test("rejects empty coverage, unknown extensions and configuration escapes", () => {
  expect(() => validate({ ...environment, INPUT_PATHS: "missing" })).toThrow();
  expect(() => validate({ ...environment, INPUT_EXTENSIONS: "dom;touch hacked" })).toThrow();
  expect(() => validate({ ...environment, INPUT_SEMGREP: "../../secret.yml" })).toThrow();
});

test("dispatches every checker with separate arguments", async () => {
  const commands: string[][] = [];
  const runner: CommandRunner = command => {
    commands.push(command);
    return Promise.resolve({ exitCode: 0, stdout: "", stderr: "" });
  };
  for (const mode of ["syntax", "style", "types", "tests", "psalm", "audit"] as const) {
    await check(mode, validate(environment), runner);
  }
  expect(commands.filter(command => command[1] === "-l")).toHaveLength(2);
  expect(commands.some(command => command.includes("--taint-analysis"))).toBe(true);
  expect(commands.some(command => command.includes("--locked") && !command.includes("--no-dev"))).toBe(true);
  expect(commands.find(command => command[0]?.endsWith("phpcs"))?.includes(join(workspace, "nested project", "phpcs.xml.dist"))).toBe(true);
});

test.each(["syntax", "style", "types", "tests", "psalm", "audit"] as const)("%s blocks on command failure", async mode => {
  // eslint-disable-next-line @typescript-eslint/await-thenable -- Bun rejects matchers return a promise at runtime.
  await expect(check(mode, validate(environment), () => Promise.resolve({ exitCode: 1, stdout: "", stderr: "fixture failure" }))).rejects.toThrow();
});

test("Semgrep requires every owned PHP file, clean parser results and zero findings", async () => {
  const config = validate(environment);
  const good = { results: [], errors: [], paths: { scanned: config.phpFiles } };
  await check("semgrep", config, () => Promise.resolve({ exitCode: 0, stdout: JSON.stringify(good), stderr: "" }));
  for (const report of [
    { ...good, errors: [{ type: "ParseError" }] },
    { ...good, results: [{ check_id: "fixture" }] },
    { ...good, paths: { scanned: [] } },
  ]) {
    // eslint-disable-next-line @typescript-eslint/await-thenable -- Await the asynchronous Bun rejects matcher.
    await expect(check("semgrep", config, () => Promise.resolve({ exitCode: 0, stdout: JSON.stringify(report), stderr: "" }))).rejects.toThrow();
  }
});

test("release composition uses shared GitVersion after checks and dry-runs PRs", () => {
  const workflow = Bun.YAML.parse(readFileSync(join(import.meta.dir, "../.github/workflows/release.yml"), "utf8")) as { jobs: { release: { needs: string; uses: string; with: Record<string, string> } } };
  expect(workflow.jobs.release.needs).toBe("test");
  expect(workflow.jobs.release.uses).toMatch(/^vhco-pro\/gh-release-workflow\/.github\/workflows\/gh-release.yml@[0-9a-f]{40}$/);
  expect(workflow.jobs.release.with["dry-run"]).toContain("pull_request");
});
