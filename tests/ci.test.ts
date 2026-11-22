import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate, check, meetsPhpFloor, supportedVersions, verifyChecksum, type CommandRunner } from "../scripts/ci";

let workspace: string;
let environment: Record<string, string>;
let previousRunnerTemp: string | undefined;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "php-ci fixture "));
  previousRunnerTemp = process.env.RUNNER_TEMP;
  process.env.RUNNER_TEMP = workspace;
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

afterEach(() => {
  if (previousRunnerTemp === undefined) delete process.env.RUNNER_TEMP;
  else process.env.RUNNER_TEMP = previousRunnerTemp;
  rmSync(workspace, { recursive: true, force: true });
});

test("validates a nested project with spaces and a supported stable PHP patch", () => {
  const config = validate(environment);
  expect(config.project).toBe(join(workspace, "nested project"));
  expect(config.phpVersion).toBe(supportedVersions()[1]);
  expect(config.phpFiles).toHaveLength(2);
  expect(config.extensions).toContain("dom");
});

test("accepts an explicit newer stable patch on the same PHP series", () => {
  expect(validate({ ...environment, INPUT_PHP: "8.5.14" }).phpVersion).toBe("8.5.14");
});

test.each(["8.4", "8.4.27", "8.5.12", "8.3.30", "8.6.0", "8.5.14RC1", "8.5.13\n", "8.5.12\nanything", "$(touch hacked)"])("rejects unsupported runtime %s", version => {
  expect(() => validate({ ...environment, INPUT_PHP: version })).toThrow();
});

test.each([
  ["8.5.13", "8.5.13", true],
  ["8.5.14", "8.5.13", true],
  ["8.5.13", "8.5.14", false],
  ["8.4.28", "8.5.13", false],
  ["8.6.0", "8.5.13", false],
  ["8.5.14RC1", "8.5.13", false],
  ["8.5.14\n", "8.5.13", false],
])("checks installed PHP %s against requested minimum %s", (version, floor, expected) => {
  expect(meetsPhpFloor(version, floor)).toBe(expected);
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
  expect(commands.find(command => command[0]?.endsWith("phpcs"))?.includes(`--standard=${join(workspace, "nested project", "phpcs.xml.dist")}`)).toBe(true);
});

test.each(["syntax", "style", "types", "tests", "psalm", "audit"] as const)("%s blocks on command failure", async mode => {
  // eslint-disable-next-line @typescript-eslint/await-thenable -- Bun rejects matchers return a promise at runtime.
  await expect(check(mode, validate(environment), () => Promise.resolve({ exitCode: 1, stdout: "", stderr: "fixture failure" }))).rejects.toThrow();
});

test("Semgrep requires every owned PHP file, clean parser results and zero findings", async () => {
  const config = validate(environment);
  const good = { results: [], errors: [], paths: { scanned: config.phpFiles } };
  await check("semgrep", config, command => {
    expect(command).toContain(`--project-root=${config.project}`);
    return Promise.resolve({ exitCode: 0, stdout: JSON.stringify(good), stderr: "" });
  });
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


test("complete example supplies only declared inputs and all required inputs", () => {
  const action = Bun.YAML.parse(readFileSync(join(import.meta.dir, "../action.yml"), "utf8")) as { inputs: Record<string, { required?: boolean }> };
  const example = Bun.YAML.parse(readFileSync(join(import.meta.dir, "../examples/standalone/ci.yml"), "utf8")) as { jobs: { php: { steps: { uses?: string; with?: Record<string, unknown> }[] } } };
  const step = example.jobs.php.steps.find(item => item.uses?.startsWith("vhco-pro/php-ci-action@"));
  expect(step).toBeDefined();
  for (const input of Object.keys(step?.with ?? {})) expect(action.inputs).toHaveProperty(input);
  for (const [name, input] of Object.entries(action.inputs)) {
    if (input.required) expect(step?.with).toHaveProperty(name);
  }
});


test("download verification rejects a modified archive", () => {
  const emptyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  expect(() => verifyChecksum(new Uint8Array(), emptyHash)).not.toThrow();
  expect(() => verifyChecksum(new Uint8Array([1]), emptyHash)).toThrow("checksum mismatch");
});


test("PHPUnit rejects an empty suite and Psalm rejects empty analysis", async () => {
  const config = validate(environment);
  await check("tests", config, command => {
    expect(command).toContain("--fail-on-empty-test-suite");
    return Promise.resolve({ exitCode: 0, stdout: "One test passed", stderr: "" });
  });
  const result = await check("psalm", config, () => Promise.resolve({ exitCode: 0, stdout: "No errors found!", stderr: "No files analyzed" })).then(() => undefined, (error: unknown) => error);
  expect(result).toBeInstanceOf(Error);
});

test("Semgrep preserves safe diagnostics on findings and parser errors", async () => {
  const messages: string[] = [];
  const capture = spyOn(console, "error").mockImplementation((value: unknown) => messages.push(String(value)));
  try {
    const config = validate(environment);
    const raw = {
      paths: { scanned: config.phpFiles },
      results: [{ check_id: "fixture-rule", path: "src/example.php", start: { line: 9 }, extra: { lines: "private-fixture-source" } }],
      errors: [{ type: "ParseError", path: "tests/example.php" }],
    };
    const result = await check("semgrep", config, () => Promise.resolve({ exitCode: 1, stdout: JSON.stringify(raw), stderr: "" })).then(() => undefined, (error: unknown) => error);
    expect(result).toBeInstanceOf(Error);
    expect(messages.join("\n")).toContain("fixture-rule");
    expect(messages.join("\n")).toContain("ParseError");
    expect(messages.join("\n")).toContain("example.php");
    expect(messages.join("\n")).not.toContain("private-fixture-source");
  } finally {
    capture.mockRestore();
  }
});

test("secret scans cover declared owned paths without blanket exclusions", async () => {
  const config = validate(environment);
  const commands: string[][] = [];
  await check("secrets", config, command => {
    commands.push(command);
    const stdout = command.includes("--is-shallow-repository") ? "false\n" : command.includes("--show-toplevel") ? workspace+"\n" : "";
    return Promise.resolve({ exitCode: 0, stdout, stderr: "" });
  });
  const directoryScans = commands.filter(command => command[0] === "gitleaks" && command[1] === "dir");
  expect(directoryScans.map(command => command.at(-1))).toEqual(config.paths);
  expect(directoryScans.every(command => !command.includes("--config"))).toBe(true);
});
