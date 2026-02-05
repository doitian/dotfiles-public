#!/usr/bin/env node
/**
 * gopass + fzf/rofi/fuzzel. Port of default/bin/fpass.
 */
import { spawn } from "node:child_process";
import { runInherit, runCapture, runWithStdin } from "./lib/run.js";

const args = process.argv.slice(2);
const isRofi = args[0] === "--rofi";
const isFuzzel = args[0] === "--fuzzel";
const rest = isRofi || isFuzzel ? args.slice(1) : args;

async function main() {
  if (isRofi) {
    if (rest.length === 0) {
      const code = await runInherit("gopass", ["list", "-f"]);
      process.exit(code ?? 0);
    }
    spawn("gopass", ["show", "-c", ...rest], { stdio: "ignore", detached: true }).unref();
    return;
  }

  if (isFuzzel) {
    const list = await runCapture("gopass", ["list", "-f"]);
    if (list.code !== 0) process.exit(list.code);
    const fuzzel = await runWithStdin("fuzzel", ["--dmenu", "-w", "50"], list.stdout);
    if (fuzzel.code !== 0 || !fuzzel.stdout) process.exit(fuzzel.code ?? 1);
    const code = await runInherit("gopass", ["show", "-c", fuzzel.stdout]);
    process.exit(code ?? 0);
  }

  process.env.GPG_TTY = process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");
  const list = await runCapture("gopass", ["list", "-f"]);
  if (list.code !== 0) process.exit(list.code);
  const fzf = await runWithStdin("fzf", [], list.stdout);
  if (fzf.code !== 0 || !fzf.stdout) process.exit(fzf.code ?? 1);
  const entry = fzf.stdout.split("\n")[0];
  const code = await runInherit("gopass", [...rest, entry].filter(Boolean));
  process.exit(code ?? 0);
}

main();
