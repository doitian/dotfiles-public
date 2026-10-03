#!/usr/bin/env bun
import { $ } from "bun";
import { spawnSyncOrExit } from "../lib/shell";

async function main() {
  if (Bun.which("apt")) {
    spawnSyncOrExit("sudo", "apt", "update");
    spawnSyncOrExit("sudo", "apt", "upgrade", "-y");
  }
  if (Bun.which("brew")) {
    await $`brew update`;
    await $`brew upgrade -y`;
  }
  if (Bun.which("paru")) {
    spawnSyncOrExit("paru", "-Syu");
  } else if (Bun.which("pacman")) {
    spawnSyncOrExit("sudo", "pacman", "-Syu");
  }

  if (Bun.which("uv")) {
    spawnSyncOrExit("mise", "run", "g:up:uv");
  }
  if (Bun.which("bun")) {
    spawnSyncOrExit("mise", "run", "g:up:bun");
  }
}

await main();
