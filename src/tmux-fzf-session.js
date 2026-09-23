#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { $ } from "bun";
import { resolveCommand, runFzf } from "./lib/tmux-fzf.js";

const USAGE = `Usage: tmux-fzf-session [-k] [-p] [<query>]

Search a session using fzf and attach to it, or create one if not found.

-k:  Kill found sessions, select multiple using tab/shift-tab

-p:  Show preview, which also can be opened using ctrl-t`;

const PREVIEW = "tmux capture-pane -p -e -t {1}";
const FORMAT = "#{session_name}\t#{window_id}\t#{window_name}\t#{window_active}\t#{window_last_flag}\t#{session_windows} windows (created #{t:session_created})#{?session_attached, (attached),}";

export function sessionsFromWindows(output) {
  const sessions = new Map();
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    const [session, window, name, active, last, description] = line.split("\t");
    const rank = name === "TMUX_FZF_WIN" ? 0 : active === "1" ? 3 : last === "1" ? 2 : 1;
    if (!sessions.has(session) || rank > sessions.get(session).rank) {
      sessions.set(session, {
        rank,
        line: `=${session}:${window}\t${session}:\t${description}`,
      });
    }
  }
  return [...sessions.values()].map(({ line }) => line).join("\n");
}

async function listSessions() {
  const tmux = await resolveCommand("tmux");
  const result = await $`${tmux} list-windows -a -F ${FORMAT}`.nothrow().quiet();
  return sessionsFromWindows(result.stdout.toString());
}

function previewWindow(show) {
  return show ? "up:80%" : "up:80%:hidden";
}

async function attachOrSwitch(name) {
  const target = `=${name}`;
  const tmux = await resolveCommand("tmux");
  if (process.env.TMUX) {
    await $`${tmux} switchc -t ${target}`;
  } else {
    await $`${tmux} attach -t ${target}`;
  }
}

export function sessionFromRow(line) {
  return line.split("\t")[1]?.slice(0, -1) ?? "";
}

export function sessionFromFzf(stdout) {
  const [query = "", selected = ""] = stdout.replace(/\r?\n$/, "").split(/\r?\n/);
  return { query, session: sessionFromRow(selected) };
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
    const rows = (await listSessions()).split("\n");
    const target = rows.find((line) => sessionFromRow(line) === session)?.split("\t")[0];
    const tmux = await resolveCommand("tmux");
    if (target) await $`${tmux} capture-pane -p -e -t ${target}`;
    return;
  }

  let query = positionals.at(-1) ?? "";
  const window = previewWindow(values.preview);

  if (values.kill) {
    const { code, stdout } = await runFzf([
      "--delimiter", "\t",
      "--with-nth", "2..",
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
    ], listSessions);
    if (code !== 0) process.exit(code);
    const tmux = await resolveCommand("tmux");
    for (const line of stdout.split(/\r?\n/)) {
      if (!line) continue;
      const name = sessionFromRow(line);
      if (!name) continue;
      await $`${tmux} kill-session -t ${`=${name}`}`;
    }
    return;
  }

  let sessions;
  if (query) {
    sessions = await listSessions();
    if (sessions.split("\n").some((line) => sessionFromRow(line) === query)) {
      await attachOrSwitch(query);
      return;
    }
  }

  const fzfArgs = [
    "--delimiter", "\t",
    "--with-nth", "2..",
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
  if (query) fzfArgs.push("-1");
  const { code, stdout } = await runFzf(fzfArgs, () => sessions ?? listSessions());
  if (code !== 0 && code !== 1) process.exit(code);
  const result = sessionFromFzf(stdout);
  query = result.session || result.query;

  if (!query) return;

  if (!result.session) {
    const tmux = await resolveCommand("tmux");
    await $`${tmux} new-session -s ${query} -d`;
  }
  await attachOrSwitch(query);
}

if (import.meta.main) await main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
