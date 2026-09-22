#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { home } from "../lib/env";

async function patchCodex() {
  const path = join(home(), ".codex/config.toml");
  const file = Bun.file(path);
  if (!(await file.exists())) return;

  const config = Bun.TOML.parse(await file.text());
  const sandbox = config.sandbox_workspace_write ??= {};
  const roots = sandbox.writable_roots ??= [];
  const root = join(home(), ".cache/mbx");
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

async function main() {
  await patchCodex();
  await patchClaude();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
