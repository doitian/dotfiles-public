#!/usr/bin/env bun
/**
 * Activate mise in Claude Code: write .claude/mise.env and set CLAUDE_ENV_FILE.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  getMiseShimsPath,
  getMiseEnv,
  getMisePathEntries,
} from "../lib/mise.js";

function escapeShell(s) {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/`/g, "\\`")}"`;
}

async function main() {
  const shimsPath = await getMiseShimsPath();
  if (!shimsPath) {
    console.error("Error: Could not find mise shims path");
    process.exit(1);
  }
  const pathEntries = await getMisePathEntries(process.cwd());
  const extraPath = [shimsPath, ...pathEntries].join(":");
  const miseEnv = await getMiseEnv();

  mkdirSync(".claude", { recursive: true });

  const lines = [`export PATH=${escapeShell(`${extraPath}:$PATH`)}`];
  for (const [key, value] of Object.entries(miseEnv)) {
    if (key === "PATH" || key === "Path") continue;
    lines.push(`export ${key}=${escapeShell(String(value))}`);
  }
  writeFileSync(".claude/mise.env", lines.join("\n") + "\n");

  const settingsPath = ".claude/settings.local.json";
  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    } catch (_) { }
  }
  if (!settings.env) settings.env = {};
  settings.env.CLAUDE_ENV_FILE = ".claude/mise.env";
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

  console.log(
    `Updated .claude/mise.env and ${settingsPath} with mise environment for: ${shimsPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
