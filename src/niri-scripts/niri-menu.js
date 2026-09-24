#!/usr/bin/env bun
/**
 * Nested menu for niri (Mod+Shift+P), powered by rofi script mode.
 * Menu tree is defined in ~/.config/niri/menu.js — edit without rebuilding.
 * Rofi keeps one window open across levels (no respawn blink); a leaf action
 * prints nothing, which tells rofi to quit. Menu path is passed between rofi
 * callbacks via the data header (ROFI_DATA). Ctrl+T goes up one level
 * (rofi custom keybinding 1, requires use-hot-keys).
 * afterClose(cmd) queues a shell command that the launcher runs once rofi has
 * exited, since rofi holds a pidfile lock and a nested rofi would fail.
 * `niri-menu [label...]` opens at a submenu path, e.g. `niri-menu Niri Shortcuts`
 * (plain labels, icons omitted); the path reaches the first rofi call via
 * NIRI_MENU_START since ROFI_DATA is unset until the script sets it.
 * `niri-menu --print` previews the menu tree without launching rofi.
 */

import { $ } from "bun";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { home } from "../lib/env.js";

const CONFIG_PATH = join(home(), ".config", "niri", "menu.js");
const SUBMENU = Symbol("submenu");
const submenu = (fn) => ({ [SUBMENU]: fn });

// Labels may start with an icon glyph (Private Use Area) for display. It is
// stripped from the row value so prefix/normal matching works on plain text;
// the full label is shown via rofi's display row option.
const PUA_ICON = /^[\u{e000}-\u{f8ff}]\s*/u;
const stripIcon = (label) => label.replace(PUA_ICON, "");

function findEntry(entries, selection) {
  if (selection in entries) return entries[selection];
  for (const [label, entry] of Object.entries(entries)) {
    if (stripIcon(label) === selection) return entry;
  }
  return undefined;
}

function spawnDetached(cmd, args = []) {
  if (Bun.which(cmd)) {
    Bun.spawn([cmd, ...args], {
      detached: true,
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    }).unref();
  }
}

async function afterClose(cmd) {
  const pending = process.env.NIRI_MENU_PENDING;
  if (pending) {
    await Bun.write(pending, cmd);
  } else {
    spawnDetached("sh", ["-c", cmd]);
  }
}

async function fail(msg) {
  console.error(`niri-menu: ${msg}`);
  if (Bun.which("notify-send")) {
    await $`notify-send niri-menu ${msg}`.quiet().nothrow();
  }
  process.exit(1);
}

let defineMenu;
try {
  defineMenu = (await import(pathToFileURL(CONFIG_PATH).href)).default;
} catch (e) {
  await fail(`cannot load ${CONFIG_PATH}: ${e.message}`);
}
if (typeof defineMenu !== "function") {
  await fail(`${CONFIG_PATH} must export default a function`);
}

const root = await defineMenu({ $, spawnDetached, submenu, afterClose });

async function resolveNode(path) {
  let node = root;
  for (const label of path) {
    const entry = findEntry(node, label);
    if (!entry || typeof entry === "function") return null;
    node = entry[SUBMENU] ? await entry[SUBMENU]() : entry;
  }
  return node;
}

function printLevel(entries, path) {
  const prompt = path.length ? `${path.join(" ")}> ` : "> ";
  process.stdout.write(`\0prompt\x1f${prompt}\n\0no-custom\x1ftrue\n\0use-hot-keys\x1ftrue\n\0data\x1f${JSON.stringify(path)}\n`);
  for (const label of Object.keys(entries)) {
    const plain = stripIcon(label);
    if (plain !== label) {
      process.stdout.write(`${plain}\0display\x1f${label}\n`);
    } else {
      console.log(label);
    }
  }
}

async function printTree(entries, prefix) {
  for (const [label, entry] of Object.entries(entries)) {
    console.log(prefix + label);
    if (typeof entry !== "function") {
      const sub = entry?.[SUBMENU] ? await entry[SUBMENU]() : entry;
      await printTree(sub, `${prefix}  `);
    }
  }
}

if (process.argv[2] === "--print") {
  await printTree(root, "");
  process.exit(0);
}

if (process.env.ROFI_RETV !== undefined) {
  let path = [];
  try {
    path = JSON.parse(process.env.ROFI_DATA || process.env.NIRI_MENU_START || "[]");
  } catch (_) { }
  const node = await resolveNode(path);
  if (!node) process.exit(0);
  if (process.env.ROFI_RETV === "10") {
    // kb-custom-1 (Ctrl+T): go up one level; reprint current level at root
    const parentPath = path.slice(0, -1);
    const parent = parentPath.length > 0 ? await resolveNode(parentPath) : root;
    printLevel(parent ?? root, parent ? parentPath : path);
    process.exit(0);
  }
  if (process.env.ROFI_RETV === "1") {
    const entry = findEntry(node, process.argv[2]);
    if (!entry) process.exit(0);
    if (typeof entry === "function") {
      await entry();
      process.exit(0);
    }
    const child = entry[SUBMENU] ? await entry[SUBMENU]() : entry;
    printLevel(child, [...path, process.argv[2]]);
  } else {
    printLevel(node, path);
  }
  process.exit(0);
}

const start = process.argv.slice(2);
if (start.length > 0 && !(await resolveNode(start))) {
  await fail(`no submenu at path: ${start.join(" > ")}`);
}

const pending = join(process.env.XDG_RUNTIME_DIR || tmpdir(), `niri-menu-${process.pid}.sh`);
const r = await $`rofi -show niri -modes ${"niri:niri-menu"}`
  .env({ ...process.env, NIRI_MENU_PENDING: pending, NIRI_MENU_START: JSON.stringify(start) })
  .quiet()
  .nothrow();
const queued = Bun.file(pending);
if (await queued.exists()) {
  const cmd = await queued.text();
  await rm(pending, { force: true });
  spawnDetached("sh", ["-c", cmd]);
}
process.exit(r.exitCode ?? 0);
