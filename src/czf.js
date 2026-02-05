#!/usr/bin/env node
/**
 * fzf over git branches/files. Renamed from pzf. Port of default/bin/pzf (Python).
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const usage = `Usage: czf <subcommand> [fzf-options...]

Subcommands:
  git-branch          Select a local git branch
  git-remote-branch   Select a remote git branch
  git-staged-file     Select a staged file from git diff --cached
  git-modified-file   Select a modified file from git diff HEAD
  git-unstaged-file   Select an unstaged file from git diff
  git-untracked-file  Select an untracked file

Examples:
  czf git-branch
  czf git-branch --multi
  czf git-staged-file --preview 'git diff --cached {1}'`;

function hasPreview(args) {
  return args.some((a) => a === "--preview" || a.startsWith("--preview="));
}

function runFzf(producerCmd, producerArgs, fzfArgs, options = {}) {
  const { defaultPreview, filter } = options;
  const fzfArgsCopy = [...fzfArgs];
  if (defaultPreview && !hasPreview(fzfArgsCopy)) fzfArgsCopy.push("--preview", defaultPreview);

  const pProd = spawn(producerCmd, producerArgs, {
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
  });

  const fzf = spawn("fzf", fzfArgsCopy, {
    stdio: ["pipe", "inherit", "inherit"],
    env: process.env,
  });

  function pipeLines(reader, writer) {
    const rl = createInterface({ input: reader, crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (filter && !filter(line)) return;
      writer.write(line + "\n");
    });
    rl.on("close", () => writer.end());
  }

  if (filter) {
    pipeLines(pProd.stdout, fzf.stdin);
  } else {
    pProd.stdout.pipe(fzf.stdin);
  }

  fzf.on("error", (e) => {
    if (e.code === "ENOENT") {
      console.error("Error: fzf not found");
      process.exit(127);
    }
    throw e;
  });
  fzf.on("close", (code, sig) => {
    pProd.kill();
    process.exit(sig ? 128 + (sig === "SIGINT" ? 2 : 0) : code);
  });
}

function gitBranch(fzfArgs) {
  runFzf("git", ["branch", "--format=%(refname:short)"], fzfArgs, {
    defaultPreview: "git -c color.ui=always log --oneline --graph -10 {1}",
  });
}

function gitRemoteBranch(fzfArgs) {
  runFzf(
    "git",
    ["for-each-ref", "--format=%(refname:short)", "refs/remotes/"],
    ["--delimiter=/", "--with-nth=2..", ...fzfArgs],
    {
      defaultPreview: "git -c color.ui=always log --oneline --graph -10 {1}",
      filter: (line) => !line.includes("HEAD") && line.includes("/"),
    }
  );
}

function gitStagedFile(fzfArgs) {
  runFzf("git", ["diff", "--name-only", "--cached"], fzfArgs, {
    defaultPreview: "git -c color.ui=always diff --cached {1}",
  });
}

function gitModifiedFile(fzfArgs) {
  runFzf("git", ["diff", "--name-only", "HEAD"], fzfArgs, {
    defaultPreview: "git -c color.ui=always diff HEAD {1}",
  });
}

function gitUnstagedFile(fzfArgs) {
  runFzf("git", ["diff", "--name-only"], fzfArgs, {
    defaultPreview: "git -c color.ui=always diff {1}",
  });
}

function gitUntrackedFile(fzfArgs) {
  runFzf("git", ["ls-files", "--others", "--exclude-standard"], fzfArgs, {
    defaultPreview: 'bat -n 50 {1} 2>/dev/null || echo "Binary or empty file"',
  });
}

const subcommands = [
  "git-branch",
  "git-remote-branch",
  "git-staged-file",
  "git-modified-file",
  "git-unstaged-file",
  "git-untracked-file",
];
const dispatch = {
  "git-branch": gitBranch,
  "git-remote-branch": gitRemoteBranch,
  "git-staged-file": gitStagedFile,
  "git-modified-file": gitModifiedFile,
  "git-unstaged-file": gitUnstagedFile,
  "git-untracked-file": gitUntrackedFile,
};

function main() {
  const arg = process.argv[2];
  const fzfArgs = process.argv.slice(3);

  if (!arg || arg === "-h" || arg === "--help") {
    console.error(usage);
    process.exit(arg === "-h" || arg === "--help" ? 0 : 1);
  }
  if (arg === "-l" || arg === "--list") {
    subcommands.forEach((c) => console.log(c));
    process.exit(0);
  }

  const fn = dispatch[arg];
  if (fn) fn(fzfArgs);
  else {
    console.error(`Unknown subcommand: ${arg}`);
    console.error(usage);
    process.exit(1);
  }
}

main();
