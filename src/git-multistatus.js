#!/usr/bin/env node
/**
 * Show git status for multiple repos (branch, dirty, ahead/behind). No starship; uses git directly.
 * Run with up to 5 repos in parallel. With TTY and without -p, runs fzf for selection.
 * Port of default/bin/git-multistatus.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { runCapture } from "./lib/run.js";

const CONCURRENCY = 5;

/**
 * Run fn on each item with at most `limit` concurrent executions.
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} fn
 * @returns {Promise<R[]>}
 * @template T, R
 */
async function mapLimit(items, limit, fn) {
  const results = [];
  const running = new Set();
  for (const item of items) {
    const p = fn(item).then((r) => {
      running.delete(p);
      return r;
    });
    running.add(p);
    results.push(p);
    while (running.size >= limit) await Promise.race(running);
  }
  return Promise.all(results);
}

/**
 * Get branch, dirty, ahead, behind for a repo. Returns null if not a git repo.
 * @param {string} dir
 * @returns {Promise<{ path: string, branch: string, remote?: string, dirty: boolean, ahead: number, behind: number } | null>}
 */
async function getRepoStatus(dir) {
  const path = resolve(dir);
  const gitDir = path + "/.git";
  if (!existsSync(path) || !existsSync(gitDir)) return null;

  const { code, stdout } = await runCapture("git", [
    "-C",
    path,
    "status",
    "-b",
    "--porcelain",
  ]);
  if (code !== 0) return null;

  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const first = lines[0];
  if (!first || !first.startsWith("## ")) return null;

  // ## branch...upstream [ahead 1, behind 2] or ## branch...upstream [ahead 1] or ## branch
  const rest = first.slice(3);
  const branchMatch = rest.match(/^([^\s.]+)(?:\.\.\.(\S+))?(?:\s+\[(.*)\])?/);
  const branch = branchMatch ? branchMatch[1] : rest.split(/\s/)[0] || "?";
  const remote = branchMatch?.[2];
  const aheadBehind = branchMatch?.[3] || "";
  let ahead = 0;
  let behind = 0;
  const aheadM = aheadBehind.match(/ahead\s+(\d+)/);
  const behindM = aheadBehind.match(/behind\s+(\d+)/);
  if (aheadM) ahead = parseInt(aheadM[1], 10);
  if (behindM) behind = parseInt(behindM[1], 10);

  const dirty = lines.length > 1;

  return { path, branch, remote, dirty, ahead, behind };
}

function formatLine(status) {
  if (!status) return null;
  const { path, branch, remote, dirty, ahead, behind } = status;
  let part = `  ${branch}`;
  if (remote) part += `:${remote}`;
  let statusStr = "";
  if (dirty) statusStr += " (dirty)";
  if (ahead > 0 || behind > 0)
    statusStr += ` (ahead ${ahead} ↑ behind ${behind} ↓)`;
  if (!statusStr) statusStr = " (≡)";
  part += statusStr;
  return `${path}\t${part}`;
}

async function showStatus(dirs) {
  const statuses = await mapLimit(dirs, CONCURRENCY, getRepoStatus);
  const lines = statuses.map(formatLine).filter(Boolean);
  return lines.join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const hasP = argv.includes("-p");
  const dirs = argv.filter((a) => a !== "-p");
  if (dirs.length === 0) {
    console.error("Usage: git-multistatus [-p] <dir>...");
    process.exit(1);
  }

  const output = await showStatus(dirs);
  const isTty = process.stdout.isTTY;

  if (!hasP && isTty && argv.indexOf("-p") === -1) {
    const reloadCmd =
      "git-multistatus " +
      dirs.map((d) => (d.includes(" ") ? `'${d}'` : d)).join(" ");
    const { spawn } = await import("node:child_process");
    const fzf = spawn(
      "fzf",
      [
        "--ansi",
        "--multi",
        "-q",
        "'dirty | 'ahead",
        "-d",
        "\t",
        "--header=^l:lazygit",
        "--header-first",
        "--preview=git -c color.ui=always -C {1} status --short --branch -u {1}",
        `--bind=ctrl-l:execute(cd {1} && lazygit -g "$(git rev-parse --git-dir)")+reload(${reloadCmd})`,
        "--bind=ctrl-r:clear-screen",
        "--bind=enter:abort+become(echo {1})",
      ],
      { stdio: ["pipe", "inherit", "inherit"] }
    );
    fzf.stdin.end(output);
    fzf.on("close", (code) => process.exit(code ?? 0));
    fzf.on("error", (err) => {
      console.error(err.message);
      process.exit(1);
    });
    return;
  }

  console.log(output);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
