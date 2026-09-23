#!/usr/bin/env bun
import { $ } from "bun";
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

async function grantCodexPermissions() {
  if (process.platform !== "win32" || !Bun.which("codex")) return;

  const path = join(home(), ".ignore");
  if (await Bun.file(path).exists()) {
    await $`icacls ${path} /grant CodexSandboxUsers:R`;
    await $`icacls ${path} /L /grant CodexSandboxUsers:R`;
  }

  const localAppData = process.env.LOCALAPPDATA || join(home(), "AppData", "Local");
  const toolDirectories = [
    join(localAppData, "nvim-data", "mason"),
    join(process.cwd(), "dist"),
  ];
  for (const directory of toolDirectories) {
    if (!(await exists(directory))) continue;

    await $`icacls ${directory} /grant "CodexSandboxUsers:(OI)(CI)(RX)" /T`.quiet();
    console.log(`Granted Codex read and execute access to ${directory}`);
  }
}

async function main() {
  await patchCodex();
  await patchClaude();
  await grantCodexPermissions();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
