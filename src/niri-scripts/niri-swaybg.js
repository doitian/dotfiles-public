#!/usr/bin/env bun
/**
 * Pick a random wallpaper from ~/Pictures/Wallpapers and run swaybg (replacing this process).
 */

import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { home } from "../lib/env.js";

const WALLPAPERS_DIR = join(home(), "Pictures", "Wallpapers");

if (!existsSync(WALLPAPERS_DIR)) {
  console.error(`Error: Wallpapers directory not found: ${WALLPAPERS_DIR}`);
  process.exit(1);
}

await $`killall swaybg`.quiet().nothrow();

const glob = new Bun.Glob("**/*");
const files = [];
for await (const file of glob.scan({ cwd: WALLPAPERS_DIR, onlyFiles: true })) {
    files.push(join(WALLPAPERS_DIR, file));
}
if (files.length === 0) {
    console.error(`Error: No wallpapers found in ${WALLPAPERS_DIR}`);
    process.exit(1);
}

const wallpaper = files[Math.floor(Math.random() * files.length)];
await $`swaybg -m fill -i ${wallpaper}`;
