#!/usr/bin/env bun
/**
 * fzf over git branches/files. Renamed from pzf. Port of default/bin/pzf (Python).
 */
import { writeClipboard } from "./lib/io.js";

const usage = `Usage: czf [-c] <subcommand> [fzf-options...]

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

async function runFzf(producerCmd, producerArgs, fzfArgs, options = {}) {
  const { defaultPreview, filter, clipboard } = options;
  const fzfArgsCopy = [...fzfArgs];
  if (defaultPreview && !hasPreview(fzfArgsCopy))
    fzfArgsCopy.push("--preview", defaultPreview);

  const pProd = Bun.spawn([producerCmd, ...producerArgs], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "inherit",
  });

  try {
    let fzf;
    const stdoutMode = clipboard ? "pipe" : "inherit";
    if (filter) {
      const out = await new Response(pProd.stdout).text();
      const lines = out.split(/\r?\n/).filter((line) => filter(line));
      const input = lines.join("\n");
      fzf = Bun.spawn(["fzf", ...fzfArgsCopy], {
        stdin: "pipe",
        stdout: stdoutMode,
        stderr: "inherit",
        env: process.env,
      });
      fzf.stdin.write(input);
      fzf.stdin.end();
    } else {
      fzf = Bun.spawn(["fzf", ...fzfArgsCopy], {
        stdin: pProd.stdout,
        stdout: stdoutMode,
        stderr: "inherit",
        env: process.env,
      });
    }
    const code = await fzf.exited;
    pProd.kill();
    if (clipboard && code === 0) {
      const output = await new Response(fzf.stdout).text();
      process.stdout.write(output);
      await writeClipboard(output.trimEnd());
    }
    const sig = fzf.signalCode;
    process.exit(sig ? 128 + (sig === "SIGINT" ? 2 : 0) : code);
  } catch (e) {
    pProd.kill();
    if (e?.code === "ENOENT") {
      console.error("Error: fzf not found");
      process.exit(127);
    }
    throw e;
  }
}

function gitBranch(fzfArgs, clipboard) {
  runFzf("git", ["branch", "--format=%(refname:short)"], fzfArgs, {
    defaultPreview: "git -c color.ui=always log --oneline --graph -10 {1}",
    clipboard,
  });
}

function gitRemoteBranch(fzfArgs, clipboard) {
  runFzf(
    "git",
    ["for-each-ref", "--format=%(refname:short)", "refs/remotes/"],
    ["--delimiter=/", "--with-nth=2..", ...fzfArgs],
    {
      defaultPreview: "git -c color.ui=always log --oneline --graph -10 {1}",
      filter: (line) => !line.includes("HEAD") && line.includes("/"),
      clipboard,
    },
  );
}

function gitStagedFile(fzfArgs, clipboard) {
  runFzf("git", ["diff", "--name-only", "--cached"], fzfArgs, {
    defaultPreview: "git -c color.ui=always diff --cached {1}",
    clipboard,
  });
}

function gitModifiedFile(fzfArgs, clipboard) {
  runFzf("git", ["diff", "--name-only", "HEAD"], fzfArgs, {
    defaultPreview: "git -c color.ui=always diff HEAD {1}",
    clipboard,
  });
}

function gitUnstagedFile(fzfArgs, clipboard) {
  runFzf("git", ["diff", "--name-only"], fzfArgs, {
    defaultPreview: "git -c color.ui=always diff {1}",
    clipboard,
  });
}

function gitUntrackedFile(fzfArgs, clipboard) {
  runFzf("git", ["ls-files", "--others", "--exclude-standard"], fzfArgs, {
    defaultPreview: 'bat -n 50 {1} 2>/dev/null || echo "Binary or empty file"',
    clipboard,
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

async function chooseSubcommand(query) {
  const fzfArgs = ["--prompt=czf> ", "--select-1", "--exit-0"];
  if (query) fzfArgs.push("--query", query);
  const fzf = Bun.spawn(["fzf", ...fzfArgs], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
    env: process.env,
  });
  fzf.stdin.write(subcommands.join("\n"));
  fzf.stdin.end();
  const code = await fzf.exited;
  if (code !== 0) {
    if (code === 1) {
      console.error(usage);
    }
    process.exit(code);
  }
  return (await new Response(fzf.stdout).text()).trim();
}

async function main() {
  let clipboard = false;
  const rawArgs = process.argv.slice(2);
  const cIdx = rawArgs.indexOf("-c");
  if (cIdx !== -1) {
    clipboard = true;
    rawArgs.splice(cIdx, 1);
  }
  const arg = rawArgs[0];
  const fzfArgs = rawArgs.slice(1);

  if (arg === "-h" || arg === "--help") {
    console.error(usage);
    process.exit(0);
  }
  if (arg === "-l" || arg === "--list") {
    subcommands.forEach((c) => console.log(c));
    process.exit(0);
  }

  if (dispatch[arg]) {
    await dispatch[arg](fzfArgs, clipboard);
  } else {
    const chosen = await chooseSubcommand(arg);
    await dispatch[chosen](fzfArgs, clipboard);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
