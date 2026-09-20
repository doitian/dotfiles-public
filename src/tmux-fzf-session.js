#!/usr/bin/env bun
/** Search, attach, create, or kill a tmux session via fzf. */
import { parseArgs } from "node:util";
import { $ } from "bun";

const USAGE = `Usage: tmux-fzf-session [-k] [-p] [<query>]

Search a session using fzf and attach to it, or create one if not found.

-k:  Kill found sessions, select multiple using tab/shift-tab

-p:  Show preview, which also can be opened using ctrl-t`;

const PREVIEW = "tmux-fzf-session --preview-session {1}";
const LIST_COMMAND = "tmux list-sessions";

async function previewOrigin() {
  if (!process.env.TMUX) return {};
  const pane = process.env.TMUX_PANE;
  const args = pane ? ["-t", pane] : [];
  const format = "#{session_name}\t#{window_id}\t#{window_name}";
  const current = await $`tmux display-message -p ${args} ${format}`.text();
  const [session, currentWindow, name] = current.trimEnd().split("\t");
  let window = currentWindow;
  if (name === "TMUX_FZF_WIN") {
    const format = "#{window_id}\t#{window_active}\t#{window_last_flag}";
    const windows = await $`tmux list-windows -t ${`=${session}`} -F ${format}`.text();
    const candidates = windows.split(/\r?\n/)
      .map((line) => line.split("\t"))
      .filter(([id]) => id && id !== currentWindow);
    window = candidates.find(([, active]) => active === "1")?.[0]
      ?? candidates.find(([, , last]) => last === "1")?.[0]
      ?? currentWindow;
    await $`tmux select-window -t ${`=${session}:${currentWindow}`}`;
  }
  return {
    TMUX_FZF_PREVIEW_SESSION: session,
    TMUX_FZF_PREVIEW_WINDOW: window,
  };
}

async function runFzf(args) {
  const origin = await previewOrigin();
  process.stdin.pause?.();
  const fzf = Bun.spawn(["fzf", ...args], {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "inherit",
    env: { ...process.env, ...origin, FZF_DEFAULT_COMMAND: LIST_COMMAND },
  });
  const stdout = await new Response(fzf.stdout).text();
  const code = await fzf.exited;
  return { code, stdout };
}

function previewWindow(show) {
  return show ? "up:80%" : "up:80%:hidden";
}

async function hasSession(name) {
  const r = await $`tmux has-session -t ${`=${name}`}`.nothrow().quiet();
  return r.exitCode === 0;
}

async function attachOrSwitch(name) {
  const target = `=${name}`;
  if (process.env.TMUX) {
    await $`tmux switchc -t ${target}`;
  } else {
    await $`tmux attach -t ${target}`;
  }
}

function sessionFromFzf(stdout) {
  const lines = stdout.replace(/\n$/, "").split("\n");
  const last = lines.at(-1) ?? "";
  return last.split(":")[0];
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      kill: { type: "boolean", short: "k" },
      preview: { type: "boolean", short: "p" },
      "preview-session": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  if (values["preview-session"] !== undefined) {
    const session = values["preview-session"];
    const window = session === process.env.TMUX_FZF_PREVIEW_SESSION
      ? process.env.TMUX_FZF_PREVIEW_WINDOW ?? ""
      : "";
    await $`tmux capture-pane -p -e -t ${`=${session}:${window}`}`;
    return;
  }

  let query = positionals.at(-1) ?? "";
  const window = previewWindow(values.preview);

  if (values.kill) {
    const { stdout } = await runFzf([
      "-d:",
      "-n1",
      "-0",
      "-m",
      "-q",
      query,
      "--preview",
      PREVIEW,
      "--preview-window",
      window,
      "--bind",
      "ctrl-t:toggle-preview",
    ]);
    for (const line of stdout.split("\n")) {
      if (!line) continue;
      const name = line.split(":")[0];
      if (!name) continue;
      await $`tmux kill-session -t ${`=${name}`}`;
    }
    return;
  }

  if (!query || !(await hasSession(query))) {
    const fzfArgs = [
      "-d:",
      "-n1",
      "-0",
      "--print-query",
      "-q",
      query,
      "--preview",
      PREVIEW,
      "--preview-window",
      window,
      "--bind",
      "ctrl-t:toggle-preview",
      "+m",
    ];
    if (query) fzfArgs.splice(3, 0, "-1");
    const { stdout } = await runFzf(fzfArgs);
    query = sessionFromFzf(stdout);
  }

  if (!query) return;

  if (!(await hasSession(query))) {
    await $`tmux new-session -s ${query} -d`;
  }
  await attachOrSwitch(query);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
