#!/usr/bin/env bun
/**
 * Activate mise in VSCode: write terminal.integrated.env.{platform} to .vscode/settings.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getMiseShimsPath, getMiseEnv } from "../lib/mise.js";

function detectPlatform() {
  if (process.platform === "darwin") return "osx";
  if (process.platform === "win32" || process.platform === "cygwin")
    return "windows";
  return "linux";
}

async function main() {
  const shimsPath = await getMiseShimsPath();
  if (!shimsPath) {
    console.error("Error: Could not find mise shims path");
    process.exit(1);
  }
  const platform = detectPlatform();
  mkdirSync(".vscode", { recursive: true });
  const settingsPath = ".vscode/settings.json";

  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    } catch (_) { }
  }

  const envKey = `terminal.integrated.env.${platform}`;
  if (!settings[envKey]) settings[envKey] = {};
  settings[envKey].PATH = `${shimsPath}:\${env:PATH}`;

  const miseEnv = await getMiseEnv();
  for (const [key, value] of Object.entries(miseEnv)) {
    if (key !== "PATH" && key !== "Path") settings[envKey][key] = value;
  }

  if (existsSync("Cargo.toml")) {
    settings["rust-analyzer.cargo.extraEnv"] = { ...settings[envKey] };
    delete settings["rust-analyzer.cargo.extraEnv"].PATH;
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  console.log(
    `Updated ${settingsPath} with mise shims path and environment variables for ${platform}: ${shimsPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
