#!/usr/bin/env bun
/**
 * gopass + fzf/rofi/fuzzel. Port of default/bin/fpass.
 */
import { $ } from "bun";

const args = process.argv.slice(2);
const isRofi = args[0] === "--rofi";
const isFuzzel = args[0] === "--fuzzel";
const rest = isRofi || isFuzzel ? args.slice(1) : args;

async function main() {
  if (isRofi) {
    if (rest.length === 0) {
      const r = await $`gopass list -f`.nothrow();
      process.exit(r.exitCode ?? 0);
    }
    const proc = Bun.spawn(["gopass", "show", "-c", ...rest], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });
    proc.unref();
    return;
  }

  if (isFuzzel) {
    const listR = await $`gopass list -f`.quiet().nothrow();
    if (listR.exitCode !== 0) process.exit(listR.exitCode);
    const list = { stdout: (listR.stdout?.toString() ?? "").trim() };
    const fuzzelR = await $`fuzzel --dmenu -w 50 < ${new Response(list.stdout)}`
      .quiet()
      .nothrow();
    const fuzzel = {
      code: fuzzelR.exitCode,
      stdout: (fuzzelR.stdout?.toString() ?? "").trim(),
    };
    if (fuzzel.code !== 0 || !fuzzel.stdout) process.exit(fuzzel.code ?? 1);
    const r = await $`gopass show -c ${fuzzel.stdout}`.nothrow();
    process.exit(r.exitCode ?? 0);
  }

  process.env.GPG_TTY =
    process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");
  const listR = await $`gopass list -f`.quiet().nothrow();
  if (listR.exitCode !== 0) process.exit(listR.exitCode);
  const list = { stdout: (listR.stdout?.toString() ?? "").trim() };
  const fzfProc = Bun.spawn(["fzf"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
    env: process.env,
  });
  fzfProc.stdin.write(list.stdout);
  fzfProc.stdin.end();
  const fzfCode = await fzfProc.exited;
  const fzfOut = fzfProc.stdout
    ? await new Response(fzfProc.stdout).text()
    : "";
  const fzfSelected = fzfOut.trim();
  if (fzfCode !== 0 || !fzfSelected) process.exit(fzfCode ?? 1);
  const entry = fzfSelected.split("\n")[0];
  const gopassArgs = [...rest, entry].filter(Boolean);
  const r = await $`gopass ${gopassArgs}`.nothrow();
  process.exit(r.exitCode ?? 0);
}

main();
