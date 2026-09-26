#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { home } from "../lib/env";
import { exists } from "../lib/fs";

/** mbx cache root: %LOCALAPPDATA%\mbx on Windows, ~/.cache/mbx elsewhere. */
function mbxCacheRoot() {
  if (process.platform === "win32") {
    return join(process.env.LOCALAPPDATA || join(home(), "AppData", "Local"), "mbx");
  }
  return join(home(), ".cache/mbx");
}

async function patchCodex() {
  const path = join(home(), ".codex/config.toml");
  const file = Bun.file(path);
  if (!(await file.exists())) return;

  const config = Bun.TOML.parse(await file.text());
  const sandbox = config.sandbox_workspace_write ??= {};
  const roots = sandbox.writable_roots ??= [];
  const root = mbxCacheRoot();
  if (roots.includes(root)) return;

  roots.push(root);
  await Bun.write(path, Bun.TOML.stringify(config));
  console.log(`Updated ${path}`);
}

async function patchClaude() {
  const path = join(home(), ".claude/settings.json");
  const file = Bun.file(path);
  const settings = (await file.exists()) ? await file.json() : {};
  const permissions = settings.permissions ??= {};
  const allow = permissions.allow ??= [];
  const permission = "Bash(gtasks:*)";
  if (allow.includes(permission)) return;

  allow.push(permission);
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`Updated ${path}`);
}

async function patchPi() {
  const path = join(home(), ".pi/agent/settings.json");
  const file = Bun.file(path);
  const settings = (await file.exists()) ? await file.json() : {};
  if (settings.defaultThinkingLevel === "high") return;

  settings.defaultThinkingLevel = "high";
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`Updated ${path}`);
}

const ULANZI_HOOK_NAMES = new Set(["ulanzi-studio", "ai-tool-state-monitor"]);
const ULANZI_HOOK_MARKER = "ai-tool-state-monitor/hooks/monitor-hook.js";

/** The Ulanzi hook installer; while it exists, Ulanzi may (re)install hooks into agent configs. */
function ulanziHookInstallerPath() {
  const appData = process.env.APPDATA || join(home(), "AppData", "Roaming");
  return join(
    appData,
    "Ulanzi/UlanziDeck/ustudio-cli/installers/install.js",
  );
}

function hookCommands(entry) {
  const commands = [];
  for (const key of ["command", "bash", "powershell"]) {
    if (typeof entry[key] === "string") commands.push(entry[key]);
  }
  for (const hook of entry.hooks ?? []) commands.push(...hookCommands(hook));
  return commands;
}

function isUlanziHookEntry(entry) {
  if (ULANZI_HOOK_NAMES.has(entry.name)) return true;
  if ((entry.hooks ?? []).some(isUlanziHookEntry)) return true;
  return hookCommands(entry).some(
    (command) =>
      command.includes(ULANZI_HOOK_MARKER) || command.includes("ustudio-cli"),
  );
}

function scrubHooks(hooks) {
  let removed = 0;
  for (const event of Object.keys(hooks)) {
    const entries = hooks[event];
    if (!Array.isArray(entries)) continue;
    const kept = entries.filter((entry) => !isUlanziHookEntry(entry));
    removed += entries.length - kept.length;
    hooks[event] = kept;
  }
  return removed;
}

async function scrubHooksFile(path) {
  if (!(await exists(path))) return;

  const settings = await Bun.file(path).json();
  const hooks = settings.hooks;
  if (hooks == null || typeof hooks !== "object") return;

  const removed = scrubHooks(hooks);
  if (removed === 0) return;

  await Bun.write(path, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`Removed ${removed} Ulanzi hook(s) from ${path}`);
}

async function scrubUlanziHooks() {
  if (!(await exists(ulanziHookInstallerPath()))) return;

  await scrubHooksFile(join(home(), ".claude/settings.json"));
  await scrubHooksFile(join(home(), ".codex/hooks.json"));
}

async function main() {
  await patchCodex();
  await patchClaude();
  await patchPi();
  await scrubUlanziHooks();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
