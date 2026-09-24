#!/usr/bin/env bun
/**
 * Toggle optional waybar widgets and reload waybar.
 * Each widget is a drop-in fragment in ~/.config/waybar/modules/ (glob-included by config.jsonc).
 * Usage: waybar-optional <toggle|on|off> <name> | waybar-optional status
 */

import { $ } from "bun";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { home } from "../lib/env.js";

const MODULES_DIR = join(home(), ".config", "waybar", "modules");

// Optional widgets: name -> waybar module definitions for the fragment file.
// The module name must be listed in a modules-* array in config.jsonc.
const widgets = {
  "agent-status": {
    "custom/agent-berth": {
      "exec-if": "command -v agent-berth",
      exec: "$HOME/.config/waybar/agent-berth.sh",
      "return-type": "json",
      interval: 5,
      "on-click": "kitty --class tui-popup agent-berth tui",
    },
  },
};

const fragmentPath = (name) => join(MODULES_DIR, `${name}.jsonc`);

async function setEnabled(name, enabled) {
  const path = fragmentPath(name);
  if (enabled) {
    await mkdir(MODULES_DIR, { recursive: true });
    const body = JSON.stringify(widgets[name], null, 2);
    await writeFile(path, `// Managed by waybar-optional; do not edit.\n${body}\n`);
  } else if (existsSync(path)) {
    await rm(path);
  }
  await $`killall -SIGUSR2 waybar`.quiet().nothrow();
}

const [command, name] = process.argv.slice(2);
const names = Object.keys(widgets);

if (command === "status") {
  for (const n of names) {
    console.log(`${n}: ${existsSync(fragmentPath(n)) ? "on" : "off"}`);
  }
} else if (["toggle", "on", "off"].includes(command) && widgets[name]) {
  const enable = command === "on" || (command === "toggle" && !existsSync(fragmentPath(name)));
  await setEnabled(name, enable);
  console.log(`${name}: ${enable ? "on" : "off"}`);
} else {
  console.error(`Usage: waybar-optional <toggle|on|off> <name> | status`);
  console.error(`Widgets: ${names.join(", ")}`);
  process.exit(1);
}
