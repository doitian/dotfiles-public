#!/usr/bin/env bun
import { $ } from "bun";
import { spawnSyncOrExit } from "../lib/shell";

async function hasCommand(cmd) {
  const check = `command -v ${$.escape(cmd)}`;
  const r = await $`sh -c ${check}`.quiet().nothrow();
  return r.exitCode === 0;
}

async function main() {
  if (await hasCommand("apt")) {
    spawnSyncOrExit("sudo", "apt", "update");
    spawnSyncOrExit("sudo", "apt", "upgrade", "-y");
  }
  if (await hasCommand("brew")) {
    spawnSyncOrExit("brew", "update");
    spawnSyncOrExit("brew", "upgrade");
  }
  if (await hasCommand("paru")) {
    spawnSyncOrExit("paru", "-Syu");
  } else if (await hasCommand("pacman")) {
    spawnSyncOrExit("sudo", "pacman", "-Syu");
  }

  if (await hasCommand("uv")) {
    spawnSyncOrExit("mise", "run", "g:up:uv");
  }
  if (await hasCommand("bun")) {
    spawnSyncOrExit("mise", "run", "g:up:bun");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
