import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, validate } from "../scripts/ci";

const source = join(import.meta.dir, "fixture");
const workspace = mkdtempSync(join(tmpdir(), "php-ci-probes-"));
const cases = [
  { mode: "syntax", path: "src/Broken.php", text: "<?php function {" },
  { mode: "style", path: "src/Greeting.php", text: "<?php echo 'style fixture';" },
  { mode: "types", path: "src/Greeting.php", text: "<?php namespace VHCO\\Fixture; final class Greeting { public static function message(string $name): string { return []; } }" },
  { mode: "tests", path: "tests/GreetingTest.php", text: readFileSync(join(source, "tests/GreetingTest.php"), "utf8").replace("'Hello world'", "'wrong'") },
  { mode: "psalm", path: "src/Unsafe.php", text: "<?php function showName(string $name): void { echo $name; } showName($_GET['name']);" },
  { mode: "semgrep", path: "src/Unsafe.php", text: "<?php file_get_contents(htmlspecialchars($_GET['path']));" },
  { mode: "secrets", path: "src/fixture-secret.txt", text: `token = "ghp_${"abcdefghijklmnopqrstuvwxyz"}${"ABCDEFGHIJ"}"` },
] as const;

try {
  for (const probe of cases) {
    const project = join(workspace, probe.mode);
    cpSync(source, project, { recursive: true });
    if (probe.mode === "secrets") {
      for (const args of [["init"], ["add", "src"], ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "Synthetic baseline"]]) {
        const result = Bun.spawnSync(["git", ...args], { cwd: project, stdout: "ignore", stderr: "ignore" });
        if (result.exitCode) throw new Error("Could not prepare the owned secret fixture.");
      }
    }
    writeFileSync(join(project, probe.path), probe.text);
    const config = validate({
      GITHUB_WORKSPACE: workspace, INPUT_PROJECT: probe.mode,
      INPUT_PHP: process.env.PHP_CI_TEST_VERSION ?? "8.5.12",
      INPUT_PATHS: "src\ntests", INPUT_SEMGREP: "security.yml",
    });
    let failed = false;
    try {
      await check(probe.mode, config);
    } catch {
      failed = true;
    }
    if (!failed) throw new Error(`${probe.mode} accepted its defective fixture.`);
    console.info(`${probe.mode} rejected its defective fixture.`);
    rmSync(project, { recursive: true, force: true });
  }
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
