import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { check, execute, supportedVersions, validate, type CommandRunner } from "../scripts/ci";

type Probe = {
  name: string;
  mode: Parameters<typeof check>[0];
  path: string;
  text: string;
  empty?: boolean;
  history?: boolean;
  expected?: string;
  safe?: boolean;
};

const source = process.env.PHP_CI_FIXTURE ?? join(import.meta.dir, "fixture");
const tracked = Bun.spawnSync(["git", "ls-files", "-z", "--", "tests/fixture"], { cwd: join(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe" });
if (tracked.exitCode) throw new Error("Could not read the standalone fixture inventory.");
const inputs = tracked.stdout.toString().split("\0").filter(Boolean);
if (inputs.length === 0) throw new Error("The standalone fixture inventory is empty.");
for (const path of inputs) {
  const file = path.slice("tests/fixture/".length);
  if (!readFileSync(join(import.meta.dir, "fixture", file)).equals(readFileSync(join(source, file)))) {
    throw new Error(`The composite changed consumer input ${file}.`);
  }
}
console.info(`Verified ${inputs.length} unchanged consumer inputs.`);

const workspace = mkdtempSync(join(tmpdir(), "php-ci-probes-"));
const token = `ghp_${"abcdefghijklmnopqrstuvwxyz"}${"ABCDEFGHIJ"}`;
const cases: Probe[] = [
  { name: "syntax", mode: "syntax", path: "src/Broken.php", text: "<?php function {", expected: "Parse error" },
  { name: "style", mode: "style", path: "src/Greeting.php", text: "<?php echo 'style fixture';", expected: "ERROR" },
  { name: "types", mode: "types", path: "src/Greeting.php", text: "<?php namespace VHCO\\Fixture; final class Greeting { public static function message(string $name): string { return []; } }", expected: "should return string" },
  { name: "assertion", mode: "tests", path: "tests/GreetingTest.php", text: readFileSync(join(source, "tests/GreetingTest.php"), "utf8").replace("'Hello world'", "'wrong'"), expected: "FAILURES" },
  { name: "cross-function-taint", mode: "psalm", path: "src/Unsafe.php", text: "<?php function showName(string $name): void { echo $name; } showName($_GET['name']);", expected: "TaintedHtml" },
  { name: "escaped-path", mode: "semgrep", path: "src/Unsafe.php", text: "<?php file_get_contents(htmlspecialchars($_GET['path']));", expected: "php-request-path" },
  { name: "secret", mode: "secrets", path: "src/fixture-secret.txt", text: `token = "${token}"`, expected: "leaks found" },
  { name: "nested-vendor-secret", mode: "secrets", path: "src/vendor/Secret.php", text: `<?php $token = "${token}";`, expected: "leaks found" },
  { name: "historical-secret", mode: "secrets", path: "src/vendor/Secret.php", text: `<?php $token = "${token}";`, history: true, expected: "leaks found" },
  { name: "empty-tests", mode: "tests", path: "phpunit.xml.dist", empty: true, text: '<phpunit><testsuites><testsuite name="Empty"><directory>empty</directory></testsuite></testsuites></phpunit>', expected: "No tests executed" },
  { name: "empty-analysis", mode: "psalm", path: "psalm.xml", empty: true, text: '<psalm xmlns="https://getpsalm.org/schema/config" errorLevel="1"><projectFiles><directory name="empty"/></projectFiles></psalm>', expected: "No files analyzed" },
  { name: "safe-html", mode: "psalm", path: "src/Safe.php", text: "<?php function showName(string $name): void { echo htmlspecialchars($name, ENT_QUOTES); } showName($_GET['name']);", safe: true },
];

function git(project: string, args: string[]): void {
  const result = Bun.spawnSync(["git", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", ...args], { cwd: project, stdout: "ignore", stderr: "ignore" });
  if (result.exitCode) throw new Error("Could not prepare the owned Git fixture.");
}

try {
  for (const probe of cases) {
    const project = join(workspace, probe.name);
    cpSync(source, project, { recursive: true });
    if (probe.mode === "secrets") {
      git(project, ["init", "--initial-branch=main"]);
      git(project, ["add", "src"]);
      git(project, ["commit", "-m", "Synthetic baseline"]);
    }
    if (probe.empty) mkdirSync(join(project, "empty"));
    mkdirSync(dirname(join(project, probe.path)), { recursive: true });
    writeFileSync(join(project, probe.path), probe.text);
    if (probe.history) {
      git(project, ["add", "src"]);
      git(project, ["commit", "-m", "Synthetic history fixture"]);
      rmSync(join(project, probe.path));
      git(project, ["add", "src"]);
      git(project, ["commit", "-m", "Remove synthetic fixture"]);
    }
    const config = validate({
      GITHUB_WORKSPACE: workspace, INPUT_PROJECT: probe.name,
      INPUT_PHP: process.env.PHP_CI_TEST_VERSION ?? supportedVersions()[1],
      INPUT_PATHS: "src\ntests", INPUT_SEMGREP: "security.yml",
    });
    let output = "";
    const observe: CommandRunner = async (command, cwd) => {
      const result = await execute(command, cwd);
      output += result.stdout + result.stderr;
      return result;
    };
    const failure = await check(probe.mode, config, observe).then(() => undefined, (error: unknown) => error);
    if (probe.safe) {
      if (failure) throw new Error(`${probe.name} rejected its safe fixture.`);
    } else {
      if (!(failure instanceof Error)) throw new Error(`${probe.name} accepted its defective fixture.`);
      if (probe.expected && !output.includes(probe.expected)) throw new Error(`${probe.name} failed without its expected diagnostic.`);
    }
    console.info(`${probe.name} produced its expected result.`);
    rmSync(project, { recursive: true, force: true });
  }
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
