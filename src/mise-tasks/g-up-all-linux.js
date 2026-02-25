#!/usr/bin/env bun
import { spawnSyncOrExit } from "../lib/shell";

function main() {
  if (Bun.which("apt")) {
    spawnSyncOrExit("sudo", "apt", "update");
    spawnSyncOrExit("sudo", "apt", "upgrade", "-y");
  }
  if (Bun.which("brew")) {
    spawnSyncOrExit("brew", "update");
    spawnSyncOrExit("brew", "upgrade");
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

main();
