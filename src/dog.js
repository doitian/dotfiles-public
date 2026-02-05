#!/usr/bin/env node
/**
 * Preview files/dirs for fzf (bat, eza, wezterm imgcat). Supports --fzf-enable / --fzf-disable.
 * Port of default/bin/dog.
 */
import { lstat, realpath } from "node:fs/promises";
import { exists } from "./lib/fs.js";
import { runInherit, runCapture } from "./lib/run.js";

function getBatOpts() {
  let opts = (process.env.BAT_OPTS || "").trim().split(/\s+/).filter(Boolean);
  opts = opts.concat("--color=always", "--line-range", ":5000");
  const cols = process.env.FZF_PREVIEW_COLUMNS;
  if (cols) {
    opts.push("--terminal-width=" + cols, "--style=numbers");
  }
  return opts;
}

async function preview(path) {
  let resolved = path;
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) {
      try {
        resolved = await realpath(path);
      } catch (_) {}
    }
  } catch (_) {}

  const pathExists = await exists(path);
  if (!pathExists) {
    console.error(`${path}: No such file or directory`);
    process.exit(1);
  }

  const stat = await lstat(path);
  if (stat.isDirectory()) {
    await runInherit("eza", ["-1", "--color", "always", "--icons", path]);
    return;
  }

  let mime = "";
  try {
    const r = await runCapture("file", ["--mime", resolved]);
    if (r.stdout) mime = r.stdout.replace(/^[^:]+:\s*/, "").trim();
  } catch (_) {}

  const isImage = mime.startsWith("image/");
  const weztermOk =
    process.env.WEZTERM_UNIX_SOCKET &&
    !process.env.TMUX &&
    !process.env.FZF_PREVIEW_COLUMNS;

  if (isImage && weztermOk) {
    await runInherit("wezterm", ["imgcat", path]);
    return;
  }

  if (mime.includes("charset=binary")) {
    await runInherit("eza", ["--color", "always", "--icons", "-ld", "--header", path]);
    if (mime) console.log(mime);
    return;
  }

  const batOpts = getBatOpts();
  await runInherit("bat", [...batOpts, path]);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--fzf-enable") {
    console.log(': "${FZF_ORIG_OPTS:="$FZF_DEFAULT_OPTS"}"');
    console.log("export FZF_DEFAULT_OPTS=\"$FZF_ORIG_OPTS --preview='dog {}'\"");
    console.log("# eval \"$(dog --fzf-enable)\"");
    process.exit(0);
  }
  if (args[0] === "--fzf-disable") {
    console.log('export FZF_DEFAULT_OPTS="$FZF_ORIG_OPTS"');
    console.log("unset FZF_ORIG_OPTS");
    console.log("# eval \"$(dog --fzf-disable)\"");
    process.exit(0);
  }

  const batOpts = getBatOpts();

  if (args.length === 0) {
    if (process.stdin.isTTY) {
      await preview(".");
    } else {
      await runInherit("bat", batOpts);
    }
    return;
  }

  for (const arg of args) {
    await preview(arg);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
