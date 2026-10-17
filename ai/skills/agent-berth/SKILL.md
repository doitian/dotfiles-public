---
name: agent-berth
description: Start, monitor, and message coding agents (Claude Code, Codex, Grok, OpenCode, Pi) running in tmux through the agent-berth CLI. Use when delegating a task to another agent, checking whether a delegated agent has finished, reading its output, or sending it follow-up instructions.
---

# Managing agents with agent-berth

agent-berth runs coding agents in tmux and tracks them through hooks. A
delegated agent has a **tmux pane id**, printed by `agent-berth new`, and a
stable session **id**, assigned once the agent first reports.

Requirements: `agent-berth`, `tmux`, and `jq` on PATH, and the agent-berth
server running with hooks installed (`agent-berth doctor` checks,
`agent-berth setup` fixes). Steps 1–4 run in order as one script.

## 1. Start an agent

```sh
pane=$(agent-berth new claude "Fix the failing test in src/parser.rs and run cargo test. Report the result back with: agent-berth send $(agent-berth self) '<summary>'")
```

- `new <command> [args...]` opens a window in the current directory's tmux
  session and passes every argument to the agent unchanged. Run it from the
  directory the agent should work in.
- stdout is only the pane id (such as `%12`); the "started" line goes to
  stderr.
- Pass the task as the initial prompt (`claude "task"`, `codex "task"`; for
  other agents see `<agent> --help`). Never use one-shot modes such as
  `claude -p` or `codex exec`: their pane closes when they finish.
- Codex and Grok appear only after their first prompt is submitted. Claude
  Code may appear earlier as `idle`. OpenCode and Pi appear once they have a
  session; if one appears without a prompt, give it the task with `send`.
- Including your own `agent-berth self` id lets the agent message you back
  (step 5). `self` only works inside an agent that agent-berth tracks; drop
  the report-back sentence otherwise.

## 2. Find the agent's id

Wait for the first report, stopping if the pane closes (the command failed)
or after about two minutes:

```sh
id=
for _ in $(seq 60); do
  id=$(agent-berth search --tmux-pane "$pane" --json | jq -r '.[0].id // empty')
  [ -n "$id" ] && break
  tmux list-panes -a -F '#{pane_id}' | grep -qxF "$pane" || break
  sleep 2
done
[ -n "$id" ] || echo "the agent in $pane never reported" >&2
```

If no id arrives, inspect the pane with `tmux capture-pane -p -t "$pane"` and
run `agent-berth doctor`.

`search --tmux-pane <pane-id> --json` returns the session the pane shows now.
It is empty before the first report and after the agent exits. OpenCode 1 and
Pi do not report which session is in front, so their pane matches every
session the process opened, newest first. Useful fields:

| Field | Meaning |
| --- | --- |
| `id` | Stable session id for `logs`, `send`, and `search <id>` |
| `status` | `running`, `waiting`, `done`, or `idle` (step 3) |
| `provider` | `claude`, `codex`, `grok`, `opencode`, or `pi` |
| `title`, `cwd` | Session title and working directory |
| `tmux_pane` | `id`, `session`, `window`, `window_name`, `path`, and `pid` of the pane |
| `last_report_ms` | Time of the latest report, in Unix milliseconds |

## 3. Wait for the turn to finish

| `status` | Meaning | What to do |
| --- | --- | --- |
| `running` | Working | Keep polling |
| `waiting` | Blocked on a permission prompt or a question | Read `logs --final` and tell the user; they answer with `agent-berth attach "$id"` (`send` cannot pick a dialog option) |
| `done` | Turn finished (Claude Code, Codex, Grok) | Read `logs --final` |
| `idle` | Turn finished (OpenCode, Pi), or not started yet | Read `logs --final` |

Right after `new` or `send`, the status can still show the previous `done` or
`idle`, so count a turn as finished only after it has been `running`, and give
up after about two minutes without `running`. Don't name the variable
`status`: it is read-only in zsh.

```sh
seen= quiet=0
while [ -n "$id" ]; do
  state=$(agent-berth search --tmux-pane "$pane" --json | jq -r '.[0].status // "gone"')
  case $state in
    running) seen=1 ;;
    waiting|gone) break ;;
    *) { [ -n "$seen" ] || [ $((quiet += 1)) -ge 8 ]; } && break ;;
  esac
  sleep 15
done
```

`gone` means the agent exited or the pane closed;
`agent-berth search "$id" --json` still finds the session. A finished turn
does not mean the task succeeded, so always read the output before reporting
back.

## 4. Read output and send messages

Transcripts are mostly tool calls, so read only what you need:

```sh
agent-berth logs "$id" --final                  # the agent's latest reply only
agent-berth logs "$id" --turns 1 --tools brief  # the latest turn, one line per tool call
agent-berth logs "$id" --turns 3 --tools none   # the last three requests and replies
agent-berth logs "$id"                          # everything, oldest first

agent-berth send "$id" "Also update the changelog, then stop."
printf 'Line one\nLine two\n' | agent-berth send "$id"   # message from stdin
```

- `--final` prints the last text of the newest turn, which answers the latest
  `send`. Before the agent replies, stdout is empty and stderr says so. For a
  `waiting` agent it ends with `Pending: <tool> <input>` lines naming what it
  is blocked on (verified for Claude Code).
- `--turns 1 --tools brief` shows how the agent got there, such as whether it
  ran the tests.
- `--json` prints the selected turns: `jq -r '.turns[-1].final'` extracts the
  reply, and `"structured": false` marks a transcript without turns.
- Grok, and sessions whose log cannot be read, fall back to the pane's
  scrollback, which has no turns: `--final` and `--turns` print its last 40
  lines (or `--tail N`) and say so on stderr.
- `send` uses the agent's CLI for Codex and OpenCode and otherwise types into
  the pane, which needs the agent in front and the pane out of copy mode.
- After `send`, wait again with the step 3 loop.

## 5. Identify yourself and message back

Inside an agent, `agent-berth self` prints that agent's id, read from the
provider's environment (such as Pi's `PI_SESSION_ID`) or from `$TMUX_PANE`:

```sh
agent-berth self          # the bare id, such as jjv21c
agent-berth self --json   # the full session JSON, as in search --json
```

The delegator sends with `agent-berth send <delegate-id> "..."`. A delegate
given the delegator's id in its prompt replies with
`agent-berth send <delegator-id> "..."` to report a result or ask a question
without being polled, then keeps working or ends its turn without waiting.

## Troubleshooting

- `new` fails with "tmux is required": install tmux, or start the agent
  manually.
- The search stays empty: run `agent-berth doctor`. Hooks may be missing, the
  server may be stopped, or a Codex or Grok agent has no prompt yet.
- `send` reports "is not the active session in a tmux pane": another tab is in
  front, or the pane is gone. Check with `agent-berth search "$id" --json`.
