import { afterEach, beforeEach, expect, setDefaultTimeout, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createMiseSandbox, globalConfig } from "./helpers/mise.js";

const tasks = Bun.TOML.parse(await Bun.file(globalConfig).text()).tasks;
const windows = process.platform === "win32";
let sandbox;

setDefaultTimeout(20000);

beforeEach(async () => {
  sandbox = await createMiseSandbox();
});

afterEach(async () => {
  await sandbox?.cleanup();
});

async function run(...args) {
  const result = await sandbox.run(args);
  expect(result.exitCode, result.stdout + result.stderr).toBe(0);
  return result.stdout + result.stderr;
}

async function readConfig(name = "mise.toml") {
  return Bun.TOML.parse(await Bun.file(join(sandbox.project, name)).text());
}

test("mise loads every global task and validates its syntax and dependencies", async () => {
  const result = await sandbox.run(["tasks", "ls", "--hidden", "--json"]);
  expect(result.exitCode, result.stderr).toBe(0);
  const loaded = JSON.parse(result.stdout);
  expect(loaded.map((task) => task.name).sort()).toEqual(Object.keys(tasks).sort());
  expect(loaded.every((task) => task.global)).toBe(true);
  await run("tasks", "validate");
});

test("mise validation fails for malformed TOML", async () => {
  await writeFile(join(sandbox.config, "config.toml"), "[tasks.broken\n");
  expect((await sandbox.run(["tasks", "validate"])).exitCode).not.toBe(0);
});

test("mise validation fails for missing task dependencies", async () => {
  await writeFile(join(sandbox.config, "config.toml"), '[tasks.broken]\ndepends = ["missing"]\n');
  expect((await sandbox.run(["tasks", "validate"])).exitCode).not.toBe(0);
});

test.each([
  ["g:up:uv", "uv tool update --all"],
  ["g:up:bun", "bun update -g --latest"],
  ["g:add:bun:all", "bun install -g @github/copilot opencode-ai"],
  ["g:add:gh:all", "gh extension install github/gh-stack"],
  ["g:ramdisk:up", "g-ramdisk-up"],
  ["g:ramdisk:down", "g-ramdisk-down"],
])("%s resolves its command without executing it", async (name, command) => {
  expect(await run("run", "--dry-run", name)).toContain(command);
});

test.each(["claude-code", "grok-cli", "codex-cli"])(
  "installer %s selects the platform's command and shell",
  async (app) => {
    const result = await sandbox.run(["tasks", "info", "--json", `g:add:${app}`]);
    expect(result.exitCode, result.stderr).toBe(0);
    const task = JSON.parse(result.stdout);
    expect(task.shell).toBe(windows
      ? "pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -Command"
      : "bash -c -o errexit");
    const output = await run("run", "--dry-run", `g:add:${app}`);
    expect(output).toContain(windows ? "Invoke-WebRequest" : "curl");
    expect(task.run.join("\n")).toContain(windows ? "finally { Remove-Item -LiteralPath" : "| bash");
    expect(task.run.join("\n")).not.toContain(windows ? "| bash" : "Invoke-WebRequest");
  },
);

test("g:up alias chooses the platform updater and then cleanup", async () => {
  const output = await run("run", "--dry-run", "g:up");
  const update = windows ? "g-up-all-windows" : "g-up-all-linux";
  const clean = windows ? "scoop cleanup -a -k" : "true";
  expect(output).toContain(update);
  expect(output).toContain(clean);
  expect(output.indexOf(update)).toBeLessThan(output.indexOf(clean));
});

test("preset:ide resolves all editor presets", async () => {
  const output = await run("run", "--dry-run", "preset:ide");
  for (const command of ["preset-neovim", "preset-vscode", "preset-claude"]) {
    expect(output).toContain(command);
  }
});

test("opencode plugin installation defaults to global and supports --local", async () => {
  await sandbox.recordCommand("opencode");
  const plugin = "compound-engineering@git+https://github.com/EveryInc/compound-engineering-plugin.git";
  await run("run", "g:opencode:ce:enable");
  expect(await Bun.file(join(sandbox.project, "opencode-args.json")).json())
    .toEqual(["plugin", plugin, "-g", "-f"]);
  await run("run", "g:opencode:ce:enable", "--local");
  expect(await Bun.file(join(sandbox.project, "opencode-args.json")).json())
    .toEqual(["plugin", plugin, "-f"]);
});

test("g:mcp forwards valid arguments", async () => {
  expect(await run("run", "--dry-run", "g:mcp", "status", "claude-code", "test-server"))
    .toContain("g-mcp status claude-code test-server");
});

test.each([
  ["invalid", "claude-code", "test-server"],
  ["status"],
])("g:mcp rejects invalid or missing arguments %j", async (...args) => {
  const result = await sandbox.run(["run", "--dry-run", "g:mcp", ...args]);
  expect(result.exitCode).not.toBe(0);
});

test("preset:python creates venv settings while preserving existing configuration", async () => {
  await writeFile(join(sandbox.project, "mise.toml"), '[env]\nKEEP = "original"\n');
  await run("run", "preset:python");
  const config = await readConfig();
  expect(config.env.KEEP).toBe("original");
  expect(config.env._.python.venv).toEqual({ path: ".venv", create: true });
});

test("preset:node preserves the config_root template and is repeatable", async () => {
  await run("run", "preset:node");
  await run("run", "preset:node");
  expect((await readConfig()).env._.path).toEqual(["{{config_root}}/node_modules/.bin"]);
});

test("preset:pre-commit creates a typos task and aggregate dependency", async () => {
  await run("run", "preset:pre-commit");
  const config = await readConfig();
  expect(config.tasks["pre-commit:typos"].run).toBe("typos");
  expect(config.tasks["pre-commit"].depends).toEqual(["pre-commit:*"]);
});

test.each([
  ["Makefile", "make"],
  ["Cargo.toml", "cargo build"],
  ["go.mod", "go build"],
  ["pyproject.toml", "python -m build"],
  ["CMakeLists.txt", "cmake --build build"],
  ["stack.yaml", "stack build"],
  ["package.json", "npm run build"],
])("preset:default detects %s", async (file, command) => {
  await sandbox.linkScript("preset-default");
  await writeFile(join(sandbox.project, file), file === "package.json" ? "{}" : "");
  await run("run", "preset:default");
  expect((await readConfig()).tasks.default.run).toBe(command);
});

test("preset:default fails when no build system is recognized", async () => {
  await sandbox.linkScript("preset-default");
  const result = await sandbox.run(["run", "preset:default"]);
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain("No recognizable build system found");
});

test("cursor notification preset creates its task", async () => {
  await run("run", "preset:cursor:hook:pushover");
  expect((await readConfig()).tasks["cursor:pushover:on:stop"].run).toBe("cursor-pushover-on-stop");
});
