#!/usr/bin/env bun
/**
 * Create a new git worktree and optionally run setup commands from .cursor/worktrees.json.
 *
 * Usage: git-wta [git-worktree-add-options...] <path> [<commit-ish>]
 *
 * After `git worktree add`, if .cursor/worktrees.json exists in the root
 * worktree, the "setup-worktree" commands are executed inside the new worktree
 * with ROOT_WORKTREE_PATH set to the root worktree path.
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { $ } from "bun";
import { exists } from "./lib/fs.js";

async function getRootWorktreePath() {
  // `git worktree list --porcelain` lists worktrees; the first one is the root.
  for await (const line of $`git worktree list --porcelain`.lines()) {
    if (line.startsWith("worktree ")) {
      return line.replace("worktree ", "");
    }
  }
  throw new Error("Could not determine root worktree path");
}

async function main() {
  const { positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      f: { type: "boolean", short: "f" },
      force: { type: "boolean" },
      detach: { type: "boolean" },
      checkout: { type: "boolean" },
      lock: { type: "boolean" },
      reason: { type: "string" },
      orphan: { type: "boolean" },
      b: { type: "string", short: "b" },
      B: { type: "string", short: "B" },
    },
    strict: false,
  });

  const args = process.argv.slice(2);
  if (positionals.length === 0) {
    console.error(
      "Usage: git-wta [git-worktree-add-options...] <path> [<commit-ish>]",
    );
    process.exit(1);
  }

  // Run git worktree add with all provided arguments
  const result = await $`git worktree add ${args}`.nothrow();
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }

  const worktreePath = resolve(positionals[0]);

  // Check for .cursor/worktrees.json in the root worktree
  const rootWorktreePath = await getRootWorktreePath();
  const configPath = resolve(rootWorktreePath, ".cursor", "worktrees.json");

  if (!(await exists(configPath))) {
    return;
  }

  const config = await Bun.file(configPath).json();
  const commands = config["setup-worktree"];
  if (!Array.isArray(commands) || commands.length === 0) {
    return;
  }

  console.log("Running setup-worktree commands…");
  const env = { ...process.env, ROOT_WORKTREE_PATH: rootWorktreePath };

  for (const cmd of commands) {
    console.log(`$ ${cmd}`);
    const r = await $`${{ raw: cmd }}`.cwd(worktreePath).env(env).nothrow();
    if (r.exitCode !== 0) {
      console.error(`Command failed with exit code ${r.exitCode}: ${cmd}`);
      process.exit(r.exitCode);
    }
  }
}

main();
