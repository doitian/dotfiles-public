#!/usr/bin/env bun
/**
 * Create a new git worktree, copy included files, and optionally run setup
 * commands from .agents/worktrees.json or .cursor/worktrees.json.
 *
 * Usage: git-wta [git-worktree-add-options...] <path> [<commit-ish>]
 *        git-wta --setup <source> <dest>
 *
 * After `git worktree add`, any untracked files in the root worktree matching
 * the patterns in .worktreeinclude (using .gitignore syntax) are copied into
 * the new worktree at the same relative paths. Then setup commands are executed
 * inside the new worktree with ROOT_WORKTREE_PATH set to the root worktree
 * path. Pass --setup to perform only the copy and setup steps for an existing
 * destination.
 */
import { cp, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { $ } from "bun";
import { exists } from "./lib/fs.js";

const usage = `Usage: git-wta [git-worktree-add-options...] <path> [<commit-ish>]
       git-wta --setup <source> <dest>`;

async function getRootWorktreePath() {
  // `git worktree list --porcelain` lists worktrees; the first one is the root.
  for await (const line of $`git worktree list --porcelain`.lines()) {
    if (line.startsWith("worktree ")) {
      return line.replace("worktree ", "");
    }
  }
  throw new Error("Could not determine root worktree path");
}

/**
 * Copy untracked files from the root worktree into the new worktree, selecting
 * them with .worktreeinclude (.gitignore syntax).
 *
 * Matching is delegated to git itself: `git ls-files -o -i --exclude-from=<file>`
 * lists untracked files matching the given patterns, recursing into matched
 * directories. Tracked files are skipped because they are already checked out
 * into the new worktree.
 */
async function copyIncludedFiles(rootWorktreePath, worktreePath) {
  const includeFile = ".worktreeinclude";
  if (!(await exists(resolve(rootWorktreePath, includeFile)))) {
    return;
  }

  // `-C rootWorktreePath` makes both the --exclude-from path and the output
  // paths resolve relative to the root worktree.
  const output =
    await $`git -C ${rootWorktreePath} ls-files -o -i --exclude-from=${includeFile}`.text();
  const relPaths = output.split("\n").filter((line) => line.length > 0);
  if (relPaths.length === 0) {
    return;
  }

  console.log(`Copying ${relPaths.length} included file(s)…`);
  for (const rel of relPaths) {
    const dest = join(worktreePath, rel);
    await mkdir(dirname(dest), { recursive: true });
    await cp(join(rootWorktreePath, rel), dest);
  }
}

async function getWorktreeConfig(rootWorktreePath) {
  for (const directory of [".agents", ".cursor"]) {
    const path = resolve(rootWorktreePath, directory, "worktrees.json");
    if (await exists(path)) {
      return Bun.file(path).json();
    }
  }
}

async function runSetupCommands(rootWorktreePath, worktreePath) {
  const config = await getWorktreeConfig(rootWorktreePath);
  if (!config) {
    return;
  }

  const platformKey =
    process.platform === "win32"
      ? "setup-worktree-windows"
      : "setup-worktree-unix";
  const setupKey = config[platformKey] != null ? platformKey : "setup-worktree";
  const commands = config[setupKey];
  if (!Array.isArray(commands) || commands.length === 0) {
    return;
  }

  console.log(`Running ${setupKey} commands…`);
  const env = { ...process.env, ROOT_WORKTREE_PATH: rootWorktreePath };

  for (const cmd of commands) {
    console.log(`$ ${cmd}`);
    const result = await $`${{ raw: cmd }}`
      .cwd(worktreePath)
      .env(env)
      .nothrow();
    if (result.exitCode !== 0) {
      console.error(`Command failed with exit code ${result.exitCode}: ${cmd}`);
      process.exit(result.exitCode);
    }
  }
}

async function setupWorktree(rootWorktreePath, worktreePath) {
  await copyIncludedFiles(rootWorktreePath, worktreePath);
  await runSetupCommands(rootWorktreePath, worktreePath);
}

async function main() {
  const { values, positionals } = parseArgs({
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
      setup: { type: "boolean" },
    },
    strict: false,
  });

  if (values.setup) {
    if (positionals.length !== 2) {
      console.error(usage);
      process.exit(1);
    }

    const [source, dest] = positionals.map((path) => resolve(path));
    await setupWorktree(source, dest);
    return;
  }

  if (positionals.length === 0) {
    console.error(usage);
    process.exit(1);
  }

  // Run git worktree add with all provided arguments
  const args = process.argv.slice(2);
  const result = await $`git worktree add ${args}`.nothrow();
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }

  const worktreePath = resolve(positionals[0]);
  const rootWorktreePath = await getRootWorktreePath();
  await setupWorktree(rootWorktreePath, worktreePath);
}

main();
