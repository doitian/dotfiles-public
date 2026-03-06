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

const CHEATSHEETS_DIR = join(
  home(),
  "Dropbox",
  "Brain",
  "para",
  "lets",
  "c",
  "Cheatsheets",
);

async function runFzf(input, query) {
  const proc = Bun.spawn(
    ["fzf", "-d", "/", "--with-nth", "-1", "-0", "-1", "-q", query],
    {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "inherit",
    },
  );
  proc.stdin.write(input);
  proc.stdin.end();
  const code = await proc.exited;
  const out = proc.stdout ? await new Response(proc.stdout).text() : "";
  return { code, out: out.trim() };
}

async function main() {
  if (!(await exists(CHEATSHEETS_DIR))) {
    console.error("Cheatsheets dir not found:", CHEATSHEETS_DIR);
    process.exit(1);
  }
  const names = await readdir(CHEATSHEETS_DIR);
  const files = names.filter((f) => f.endsWith(".cheat.md"));
  if (files.length === 0) process.exit(0);

  const query = process.argv.slice(2).join(" ");
  const { code, out } = await runFzf(files.join("\n"), query);
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
