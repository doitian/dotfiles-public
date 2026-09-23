#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { $ } from "bun";
import { resolveCommand, runFzf } from "./lib/tmux-fzf.js";

const USAGE = `Usage: tmux-fzf-pane [-k] [-p] [-a|-s] [<query>]

Switch to a pane.

-a:  Select panes from all sessions instead of current window

-s:  Select panes from active session instead of current window

-k:  Kill found panes, select multiple using tab/shift-tab

-p:  Show preview, also can be opened using ctrl-t`;

const FORMAT_WINDOW =
  "=#S:#I.#{pane_id}\t#P#{?pane_active,>,.}#{pane_current_command} #{pane_current_path}";
const FORMAT_ALL =
  "=#S:#I.#{pane_id}\t#S/#I.#W#{?window_active,*,}#{?window_last_flag,#,}/#P#{?pane_active,>,.}#{pane_current_command} #{pane_current_path}";
const FORMAT_SESSION =
  "=#S:#I.#{pane_id}\t#I.#W#{?window_active,*,}#{?window_last_flag,#,}/#P#{?pane_active,>,.}#{pane_current_command} #{pane_current_path}";

function firstField(line) {
  return line.split(/\r?\n/, 1)[0].split("\t", 1)[0];
}

async function listPanes(flags, format) {
  const tmux = await resolveCommand("tmux");
  const output = await $`${tmux} list-panes ${flags} -F ${format}`.text();
  return output
    .split(/\r?\n/)
    .filter((line) => line && !/[0-9]\.TMUX_FZF_WIN/.test(line))
    .join("\n");
}

async function hasTarget(target) {
  const tmux = await resolveCommand("tmux");
  const r = await $`${tmux} has-session -t ${target}`.nothrow().quiet();
  return r.exitCode === 0;
}

async function attachOrSwitch(target) {
  const tmux = await resolveCommand("tmux");
  if (process.env.TMUX) {
    await $`${tmux} switchc -t ${target}`;
  } else {
    await $`${tmux} attach -t ${target}`;
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      all: { type: "boolean", short: "a" },
      session: { type: "boolean", short: "s" },
      kill: { type: "boolean", short: "k" },
      preview: { type: "boolean", short: "p" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  const query = positionals.at(-1) ?? "";
  const flags = [];
  let format = FORMAT_WINDOW;
  if (values.all) {
    flags.push("-a");
    format = FORMAT_ALL;
  }
  if (values.session) {
    flags.push("-s");
    format = FORMAT_SESSION;
  }

  let previewWindow = "up:80%:hidden";
  if (values.preview) {
    previewWindow = previewWindow.replace(/:[^:]*$/, "");
  }
  const preview = "tmux capture-pane -p -e -t {1}";

  if (values.kill) {
    const { code, stdout } = await runFzf(
      [
        "--delimiter",
        "\t",
        "--with-nth",
        "2..",
        "-0",
        "-m",
        "-q",
        query,
        "--preview",
        preview,
        "--preview-window",
        previewWindow,
        "--bind",
        "ctrl-t:toggle-preview",
      ],
      () => listPanes(flags, format),
    );
    if (code !== 0) process.exit(code);
    const tmux = await resolveCommand("tmux");
    for (const line of stdout.split("\n")) {
      if (!line) continue;
      const id = firstField(line);
      if (!id) continue;
      await $`${tmux} kill-pane -t ${id}`;
    }
    return;
  }

  let target = `=${query}`;
  if (!query || !(await hasTarget(target))) {
    const fzfArgs = [
      "--delimiter",
      "\t",
      "--with-nth",
      "2..",
      "-0",
      "-q",
      query,
      "--preview",
      preview,
      "--preview-window",
      previewWindow,
      "+m",
      "--bind",
      "enter:accept,ctrl-t:toggle-preview",
    ];
    if (query) fzfArgs.splice(2, 0, "-1");
    const { code, stdout } = await runFzf(fzfArgs, () => listPanes(flags, format));
    if (code !== 0) process.exit(code);
    target = firstField(stdout);
  }

  if (target) {
    await attachOrSwitch(target);
  }
}

await main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
