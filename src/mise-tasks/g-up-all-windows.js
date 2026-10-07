#!/usr/bin/env bun
import { $ } from "bun";
import { spawnSyncOrExit } from "../lib/shell";

async function main() {
  if (Bun.which("scoop")) {
    spawnSyncOrExit("scoop", "update", "-a");
  }
  if (Bun.which("uv")) {
    spawnSyncOrExit("mise", "run", "g:up:uv");
  }
  if (Bun.which("bun")) {
    spawnSyncOrExit("mise", "run", "g:up:bun");
  }
  if (Bun.which("pi") || Bun.which("opencode") || Bun.which("claude")) {
    spawnSyncOrExit("mise", "run", "g:up:plugins");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
