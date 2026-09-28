#!/usr/bin/env bun
/**
 * Toggle optional waybar widgets and reload waybar.
 * Widget fragments are managed in the dotfiles repo (default/.config/waybar/optional/,
 * linked to ~/.config/waybar/optional/); enabling one symlinks it into
 * ~/.config/waybar/modules/ (glob-included by config.jsonc).
 * Usage: waybar-optional <toggle|on|off> <name> | waybar-optional status
 */

import { $ } from "bun";
import { mkdir, readdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { home } from "../lib/env.js";
import { exists } from "../lib/fs.js";

const WAYBAR_DIR = join(home(), ".config", "waybar");
const OPTIONAL_DIR = join(WAYBAR_DIR, "optional");
const MODULES_DIR = join(WAYBAR_DIR, "modules");

const fragmentPath = (name) => join(MODULES_DIR, `${name}.jsonc`);

async function availableWidgets() {
  try {
    const files = await readdir(OPTIONAL_DIR);
    return files
      .filter((f) => f.endsWith(".jsonc"))
      .map((f) => f.slice(0, -".jsonc".length))
      .sort();
  } catch {
    return [];
  }
}

async function setEnabled(name, enabled) {
  const path = fragmentPath(name);
  await rm(path, { force: true });
  if (enabled) {
    await mkdir(MODULES_DIR, { recursive: true });
    await symlink(join(OPTIONAL_DIR, `${name}.jsonc`), path);
  }
  await $`killall -SIGUSR2 waybar`.quiet().nothrow();
}

const [command, name] = process.argv.slice(2);
const names = await availableWidgets();

if (command === "status") {
  for (const n of names) {
    console.log(`${n}: ${(await exists(fragmentPath(n))) ? "on" : "off"}`);
  }
} else if (["toggle", "on", "off"].includes(command) && names.includes(name)) {
  const enable = command === "on" || (command === "toggle" && !(await exists(fragmentPath(name))));
  await setEnabled(name, enable);
  console.log(`${name}: ${enable ? "on" : "off"}`);
} else {
  console.error("Usage: waybar-optional <toggle|on|off> <name> | status");
  console.error(`Widgets: ${names.join(", ")}`);
  process.exit(1);
}
