import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exists } from "../src/lib/fs.js";
import { installedAgentPatches, patchAgents } from "../src/mise-tasks/g-agent-config.js";

const ENV_KEYS = [
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "NO_SECRET_ENV_VAR",
  "OPENAI_BASE_URL",
  "OPENAI_API_KEY",
  "OPENAI_DEFAULT_MODEL",
];

let home;
let savedEnv;

beforeEach(async () => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  home = await mkdtemp(join(tmpdir(), "g-agent-config-"));
  Object.assign(process.env, {
    HOME: home,
    USERPROFILE: home,
    APPDATA: join(home, "AppData", "Roaming"),
    LOCALAPPDATA: join(home, "AppData", "Local"),
    NO_SECRET_ENV_VAR: "",
    OPENAI_BASE_URL: "https://api.openai.com/v1",
    OPENAI_API_KEY: "test-key",
    OPENAI_DEFAULT_MODEL: "gpt-5",
  });
});

afterEach(async () => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(home, { recursive: true, force: true });
});

/** Resolves only `commands`; the returned paths are never executed. */
function whichOf(commands) {
  const installed = new Set(commands);
  return (command) => (installed.has(command) ? `/stub/${command}` : null);
}

function mbxCacheRoot() {
  return process.platform === "win32"
    ? join(home, "AppData", "Local", "mbx")
    : join(home, ".cache/mbx");
}

test("installedAgentPatches keeps only agents whose CLI resolves", () => {
  expect(installedAgentPatches(() => null)).toEqual([]);
  const installed = installedAgentPatches(whichOf(["pi", "opencode"]));
  expect(installed.map(({ command }) => command)).toEqual(["pi", "opencode"]);
});

test("patchAgents creates missing configs of installed agents", async () => {
  await patchAgents(whichOf(["codex", "claude", "pi"]));

  const codex = Bun.TOML.parse(await Bun.file(join(home, ".codex/config.toml")).text());
  expect(codex.sandbox_workspace_write.writable_roots).toEqual([mbxCacheRoot()]);
  expect(await Bun.file(join(home, ".claude/settings.json")).json()).toEqual({
    permissions: { allow: ["Bash(gtasks:*)"] },
  });
  expect(await Bun.file(join(home, ".pi/agent/settings.json")).json()).toEqual({
    defaultThinkingLevel: "high",
  });
});

test("patchAgents skips agents whose CLI is absent", async () => {
  await patchAgents(whichOf(["claude"]));

  expect(await exists(join(home, ".claude/settings.json"))).toBe(true);
  for (const path of [
    ".codex/config.toml",
    ".pi/agent/settings.json",
    ".pi/agent/models.json",
    ".config/opencode/opencode.jsonc",
    ".config/opencode/cli.json",
  ]) {
    expect(await exists(join(home, path)), path).toBe(false);
  }
});

test("a non-Aliyun endpoint only patches opencode's cli.json", async () => {
  await patchAgents(whichOf(["opencode"]));

  expect(await Bun.file(join(home, ".config/opencode/cli.json")).json()).toMatchObject({
    theme: { name: "catppuccin", mode: "light" },
    keybinds: { "prompt.editor": "ctrl+g" },
    tabs: { mode: "off" },
  });
  expect(await exists(join(home, ".config/opencode/opencode.jsonc"))).toBe(false);
});

test("patchAgents keeps existing settings and is idempotent", async () => {
  const which = whichOf(["codex", "claude", "pi", "opencode"]);
  const paths = [
    join(home, ".codex/config.toml"),
    join(home, ".claude/settings.json"),
    join(home, ".pi/agent/settings.json"),
    join(home, ".config/opencode/cli.json"),
  ];

  await patchAgents(which);
  const settings = Bun.file(join(home, ".claude/settings.json"));
  const kept = { permissions: { allow: ["Bash(gtasks:*)"] }, theme: "dark" };
  await settings.write(JSON.stringify(kept));
  const before = await Promise.all(paths.map((path) => Bun.file(path).text()));

  await patchAgents(which);
  expect(await Promise.all(paths.map((path) => Bun.file(path).text()))).toEqual(before);
  expect(await settings.json()).toMatchObject({ theme: "dark" });
});
