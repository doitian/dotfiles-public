#!/usr/bin/env bun
/**
 * Activate mise in Claude Code: write .claude/mise.env and set CLAUDE_ENV_FILE.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { readJsoncObject } from "../lib/fs.js";
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

  const settingsPath = ".claude/settings.local.json";
  const settings = await readJsoncObject(settingsPath);

  mkdirSync(".claude", { recursive: true });

  const lines = [`export PATH=${escapeShell(`${extraPath}:$PATH`)}`];
  for (const [key, value] of Object.entries(miseEnv)) {
    if (key === "PATH" || key === "Path") continue;
    lines.push(`export ${key}=${escapeShell(String(value))}`);
  }
  writeFileSync(".claude/mise.env", lines.join("\n") + "\n");

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
