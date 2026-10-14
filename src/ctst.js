#!/usr/bin/env bun
/**
 * List cheatsheet .cheat.md files and pick one with fzf, then cat it.
 * Port of default/bin/ctst.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { exists } from "./lib/fs.js";
import { home } from "./lib/env.js";
import { spawnSyncOrExit } from "./lib/shell.js";
import { fzf } from "./lib/fzf.js";

const CHEATSHEETS_DIR = join(
  home(),
  "Dropbox",
  "Brain",
  "para",
  "lets",
  "c",
  "Cheatsheets",
);

async function main() {
  if (!(await exists(CHEATSHEETS_DIR))) {
    console.error("Cheatsheets dir not found:", CHEATSHEETS_DIR);
    process.exit(1);
  }
  const names = await readdir(CHEATSHEETS_DIR);
  const files = names.filter((f) => f.endsWith(".cheat.md"));
  if (files.length === 0) process.exit(0);

  const query = process.argv.slice(2).join(" ");
  const { code, stdout } = await fzf(
    ["-d", "/", "--with-nth", "-1", "-0", "-1", "-q", query],
    files.join("\n"),
  );
  const out = stdout.trim();
  if (code !== 0 || !out) process.exit(code ?? 1);

  const chosen = out.split("\n")[0];
  const path = join(CHEATSHEETS_DIR, chosen);
  const content = await readFile(path, "utf8");

  if (process.stdout.isTTY && Bun.which("glow")) {
    spawnSyncOrExit("glow", "-p", path);
  } else {
    process.stdout.write(content);
  }
}

main();
