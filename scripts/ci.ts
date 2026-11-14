import { appendFileSync, chmodSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";

type Mode = "syntax" | "style" | "types" | "tests" | "psalm" | "audit" | "semgrep" | "secrets";
type Result = { exitCode: number; stdout: string; stderr: string };
export type CommandRunner = (command: string[], cwd: string) => Promise<Result>;
export interface Configuration {
  project: string;
  phpVersion: string;
  extensions: string;
  phpFiles: string[];
  paths: string[];
  phpcs: string;
  phpstan: string;
  phpunit: string;
  psalm: string;
  semgrep: string;
  gitleaks: string | undefined;
  base: string;
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Expected an object.");
  return value as Record<string, unknown>;
}

const tools = object(Bun.YAML.parse(readFileSync(join(import.meta.dir, "tools.yaml"), "utf8")));

export function supportedVersions(): [string, string] {
  if (typeof tools.php84 !== "string" || !/^8\.4\.\d+$/.test(tools.php84)
      || typeof tools.php85 !== "string" || !/^8\.5\.\d+$/.test(tools.php85)) {
    throw new Error("Invalid patched PHP matrix.");
  }
  return [tools.php84, tools.php85];
}

function inside(root: string, input: string): string {
  // eslint-disable-next-line no-control-regex -- Block control bytes before paths enter GitHub step output.
  if (/[\x00-\x1f\x7f]/.test(input)) throw new Error("Control characters are forbidden in paths.");
  const path = realpathSync(resolve(root, input));
  const child = relative(root, path);
  if (child === ".." || child.startsWith(`..${sep}`) || isAbsolute(child)) throw new Error("Path escapes the consumer checkout.");
  return path;
}

function phpFiles(path: string): string[] {
  if (lstatSync(path).isSymbolicLink()) throw new Error("Symlink source paths are unsupported.");
  if (!lstatSync(path).isDirectory()) return path.endsWith(".php") ? [path] : [];
  return readdirSync(path).flatMap(entry => phpFiles(join(path, entry)));
}

export function validate(env: Record<string, string | undefined>): Configuration {
  const workspace = realpathSync(env.GITHUB_WORKSPACE ?? process.cwd());
  const project = inside(workspace, env.INPUT_PROJECT ?? ".");
  if (!lstatSync(project).isDirectory()) throw new Error("Working directory must be a directory.");
  const phpVersion = env.INPUT_PHP ?? "";
  if (!supportedVersions().includes(phpVersion)) throw new Error("Select a declared patched PHP version.");
  const extensions = (env.INPUT_EXTENSIONS ?? "").split(",").map(item => item.trim()).filter(Boolean);
  if (extensions.some(item => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(item))) throw new Error("Invalid PHP extension identifier.");
  const paths = (env.INPUT_PATHS ?? "src\ntests").split("\n").map(item => item.trim()).filter(Boolean).map(path => inside(project, path));
  const files = [...new Set(paths.flatMap(phpFiles))];
  if (files.length === 0) throw new Error("The selected paths contain no PHP files.");
  const configFile = (name: string, fallback: string): string => {
    const file = inside(project, env[name] || fallback);
    if (!lstatSync(file).isFile()) throw new Error("Configuration must be a regular file.");
    return file;
  };
  configFile("INPUT_COMPOSER", "composer.json");
  configFile("INPUT_LOCK", "composer.lock");
  const base = env.INPUT_BASE ?? "";
  if (base !== "" && !/^[0-9a-f]{40}$/.test(base)) throw new Error("Secret-scan base must be a full commit SHA.");
  return {
    project, phpVersion, extensions: extensions.join(","), paths, phpFiles: files,
    phpcs: configFile("INPUT_PHPCS", "phpcs.xml.dist"),
    phpstan: configFile("INPUT_PHPSTAN", "phpstan.neon"),
    phpunit: configFile("INPUT_PHPUNIT", "phpunit.xml.dist"),
    psalm: configFile("INPUT_PSALM", "psalm.xml"),
    semgrep: configFile("INPUT_SEMGREP", "security.yml"),
    gitleaks: env.INPUT_GITLEAKS ? configFile("INPUT_GITLEAKS", "") : undefined,
    base,
  };
}

const execute: CommandRunner = async (command, cwd) => {
  const process = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe", timeout: 600_000 });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited,
  ]);
  return { exitCode, stdout, stderr };
};

async function requireSuccess(command: string[], cwd: string, runner: CommandRunner, silent = false): Promise<string> {
  const result = await runner(command, cwd);
  if (!silent) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
  }
  if (result.exitCode !== 0) throw new Error(`${basename(command[0] ?? "check")} failed with exit ${result.exitCode}.`);
  return result.stdout;
}

export async function check(mode: Mode, config: Configuration, runner: CommandRunner = execute): Promise<void> {
  const binary = (name: string) => join(config.project, "vendor/bin", name);
  const run = (command: string[], silent = false) => requireSuccess(command, config.project, runner, silent);
  switch (mode) {
    case "syntax":
      for (const file of config.phpFiles) await run(["php", "-l", file]);
      break;
    case "style": await run([binary("phpcs"), `--standard=${config.phpcs}`]); break;
    case "types": await run([binary("phpstan"), "analyse", "--no-progress", "--configuration", config.phpstan]); break;
    case "tests": await run([binary("phpunit"), "--configuration", config.phpunit]); break;
    case "psalm": await run([binary("psalm"), "--taint-analysis", "--no-cache", "--threads=1", "--config", config.psalm]); break;
    case "audit": await run(["composer", "audit", "--locked", "--abandoned=fail"]); break;
    case "semgrep": {
      const result = await run(["semgrep", "scan", "--jobs", "1", "--metrics=off", "--disable-version-check", "--error", "--strict", "--no-git-ignore", "--json", "--config", config.semgrep, ...config.paths], true);
      const report = object(JSON.parse(result));
      const scanned = object(report.paths).scanned;
      if (!Array.isArray(scanned) || !Array.isArray(report.errors) || !Array.isArray(report.results)) throw new Error("Incomplete Semgrep result.");
      const actual = new Set(scanned.filter((path): path is string => typeof path === "string").map(path => resolve(config.project, path)));
      if (report.errors.length || report.results.length || config.phpFiles.some(path => !actual.has(path))) throw new Error("Semgrep findings, errors or incomplete PHP coverage.");
      console.info(`Semgrep checked ${config.phpFiles.length} owned PHP files.`);
      break;
    }
    case "secrets": {
      const shallow = (await run(["git", "rev-parse", "--is-shallow-repository"], true)).trim();
      if (shallow !== "false") throw new Error("Secret scanning requires a complete checkout.");
      const repository = realpathSync((await run(["git", "rev-parse", "--show-toplevel"], true)).trim());
      if (config.base) await run(["git", "merge-base", "--is-ancestor", config.base, "HEAD"], true);
      const options = ["--config", config.gitleaks ?? join(import.meta.dir, "security/gitleaks.toml")];
      await run(["gitleaks", "git", "--redact=100", "--no-banner", `--log-opts=${config.base ? `${config.base}..HEAD` : "HEAD"}`, ...options, repository]);
      await run(["gitleaks", "dir", "--redact=100", "--no-banner", ...options, config.project]);
      break;
    }
  }
}

async function install(config: Configuration): Promise<void> {
  const run = (command: string[]) => requireSuccess(command, config.project, execute);
  const version = (await run(["php", "-r", "echo PHP_VERSION;"])).trim();
  if (version !== config.phpVersion) throw new Error("The installed PHP version differs from the approved input.");
  const composer = await run(["composer", "--version", "--no-ansi"]);
  if (!composer.startsWith(`Composer version ${String(tools.composer)} `)) throw new Error("Unexpected Composer version.");
  await run(["composer", "validate", "--strict", "--no-check-publish"]);
  await run(["composer", "install", "--no-interaction", "--prefer-dist", "--no-plugins", "--no-scripts"]);
  await run(["composer", "check-platform-reqs"]);
  const root = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), "php-ci-tools-"));
  chmodSync(root, 0o700);
  const environment = join(root, "python");
  await run(["python3", "-m", "venv", environment]);
  await run([join(environment, "bin/pip"), "install", "--require-hashes", "-r", join(import.meta.dir, "security/requirements.txt")]);
  const gitleaks = object(tools.gitleaks);
  const releaseVersion = String(gitleaks.version);
  if (!/^\d+\.\d+\.\d+$/.test(releaseVersion) || !/^[0-9a-f]{64}$/.test(String(gitleaks.sha256))) throw new Error("Invalid Gitleaks tool pin.");
  const response = await fetch(`https://github.com/gitleaks/gitleaks/releases/download/v${releaseVersion}/gitleaks_${releaseVersion}_linux_x64.tar.gz`, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error("Gitleaks download failed.");
  const data = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(data).digest("hex") !== gitleaks.sha256) throw new Error("Gitleaks checksum mismatch.");
  const archive = join(root, "gitleaks.tar.gz");
  writeFileSync(archive, data, { mode: 0o600 });
  await run(["tar", "-xzf", archive, "-C", root, "gitleaks"]);
  if (!process.env.GITHUB_PATH) throw new Error("GITHUB_PATH is required.");
  appendFileSync(process.env.GITHUB_PATH, `${join(environment, "bin")}\n${root}\n`);
}

if (import.meta.main) {
  try {
    const mode = process.argv[2];
    if (mode === "matrix") {
      if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
      appendFileSync(process.env.GITHUB_OUTPUT, `versions=${JSON.stringify(supportedVersions())}\n`);
    } else {
    const environment: Record<string, string | undefined> = { ...process.env };
    const inputKeys = ["INPUT_PROJECT", "INPUT_PHP", "INPUT_EXTENSIONS", "INPUT_PATHS", "INPUT_PHPCS", "INPUT_PHPSTAN", "INPUT_PHPUNIT", "INPUT_PSALM", "INPUT_SEMGREP", "INPUT_GITLEAKS", "INPUT_BASE"];
    if (process.env.PHP_CI_INPUTS_JSON) {
      const supplied = object(JSON.parse(process.env.PHP_CI_INPUTS_JSON));
      for (const [key, value] of Object.entries(supplied)) {
        if (!inputKeys.includes(key) || typeof value !== "string") throw new Error("Invalid serialized action input.");
        environment[key] = value;
      }
    }
    const config = validate(environment);
    if (mode === "validate") {
      if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
      appendFileSync(process.env.GITHUB_OUTPUT, `project=${config.project}\nphp-version=${config.phpVersion}\nextensions=${config.extensions}\ncomposer-version=${String(tools.composer)}\ninputs-json=${JSON.stringify(Object.fromEntries(inputKeys.map(key => [key, environment[key]])))}\n`);
    } else if (mode === "install") {
      await install(config);
    } else if (["syntax", "style", "types", "tests", "psalm", "audit", "semgrep", "secrets"].includes(mode ?? "")) {
      await check(mode as Mode, config);
    } else {
      throw new Error("Unknown PHP CI operation.");
    }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "PHP CI failed.");
    process.exitCode = 1;
  }
}
