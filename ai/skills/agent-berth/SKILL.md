---
name: agent-berth
description: Start, monitor, message, and stop coding agents (Claude Code, Codex, Grok, OpenCode, Pi) running in tmux through the agent-berth CLI. Use when delegating a task to another agent, checking whether a delegated agent has finished, reading its output, sending it follow-up instructions, replying to the agent that delegated to you, or stopping a delegate.
---

# Managing agents with agent-berth

agent-berth runs coding agents in tmux and tracks them through hooks. A
delegated agent gets a stable session **id** once it first reports;
`new --wait` prints it, and every other command takes it.

Requirements: `agent-berth` and `tmux` on PATH, and the agent-berth server
running with hooks installed (`agent-berth doctor` checks, `agent-berth
setup` fixes). Steps 1 to 3 run in order as one script.

## 1. Start an agent

```sh
id=$(agent-berth new --wait claude --permission-mode bypassPermissions "Fix the failing test in src/parser.rs and run cargo test, then report the result with agent-berth reply.")
```

- `new <command> [args...]` opens a window in the current directory's tmux
  session and passes every argument to the agent unchanged. Run it from the
  directory the agent should work in.
- `--wait` blocks until the agent first reports and prints its id; stdout is
  only the id, the "started ... (pane %N)" line goes to stderr. It exits 4
  after `--timeout` (default `2m`) and 1 when the pane closes first.
- Before starting an agent, read its reference file. Each one has a full
  example with an initial prompt, auto approval, and a chosen model, explains
  those options, and shows how to list the agent's models:

  | Agent | Reference |
  | --- | --- |
  | Claude Code | [references/claude.md](references/claude.md) |
  | Codex | [references/codex.md](references/codex.md) |
  | OpenCode | [references/opencode.md](references/opencode.md) |
  | Grok | [references/grok.md](references/grok.md) |
  | CodeBuddy Code | [references/codebuddy.md](references/codebuddy.md) |
  | Pi | [references/pi.md](references/pi.md) |

- Pass the task as the initial prompt. Never use one-shot modes such as
  `claude -p` or `codex exec`: their pane closes when they finish.
- A `waiting` delegate needs a human to answer its dialog, so when its work
  is sandboxed start it with the auto-approval option from its reference.
- The delegate learns your id from `AGENT_BERTH_DELEGATOR` in its
  environment and answers with `agent-berth reply` (step 4), so the prompt
  only needs to say when to report.
- Codex and Grok report only after their first prompt is submitted, so
  `--wait` returns once the task is running. Claude Code may report earlier,
  as `idle`.

## 2. Wait for the turn to finish

`wait` blocks until the agent ends a turn, judged by the session's
`turns_ended` count rather than its `status`, so a turn that finishes
quickly is not missed. Right after `new` the count is 0, so `--after 0` is
race-free even if the first turn has already ended:

```sh
agent-berth wait --after 0 "$id"
```

It prints one word on stdout, the reason on stderr, and exits with a
distinct code; the default `--timeout` is `10m`:

| stdout (exit) | Meaning | What to do |
| --- | --- | --- |
| `done` (0) | Turn finished | Read `logs --final` |
| `waiting` (2) | Blocked on a permission prompt or a question | Read `logs --final` and tell the user; they answer with `agent-berth attach "$id"` (`send` refuses a waiting session) |
| `gone` (3) | The agent exited or the pane closed | `agent-berth search "$id" --json` still finds the session; read `logs` to see how far it got |
| `timeout` (4) | No turn ended in time | Read `logs "$id" --turns 1 --tools brief`, then wait again or tell the user |

Always give `wait` a baseline: without `--after`, a turn that ended before
it started is missed. After `new` the baseline is 0; after a message, use
`send --wait` (step 3). A finished turn does not mean the task succeeded, so
always read the output before reporting back.

An orchestrating Claude Code agent's shell tool times out after 2 minutes by
default and 10 at most, so give a long `wait` a matching tool timeout
(`--timeout 9m`) or run it in the background.

To fan out, start every delegate first, then wait on each in turn; one that
finished early is still `done`:

```sh
a=$(agent-berth new --wait claude "Task A")
b=$(agent-berth new --wait codex "Task B")
for id in "$a" "$b"; do
  agent-berth wait --after 0 "$id" && agent-berth logs "$id" --final
done
```

## 3. Read output and send messages

Transcripts are mostly tool calls, so read only what you need:

```sh
agent-berth logs "$id" --final                  # the agent's latest reply only
agent-berth logs "$id" --turns 1 --tools brief  # the latest turn, one line per tool call

agent-berth send --wait "$id" "Also update the changelog, then stop."   # deliver, then wait as in step 2
```

- `--final` prints the last text of the newest turn, which answers the latest
  `send`. Before the agent replies, stdout is empty and stderr says so. For a
  `waiting` agent it ends with `Pending: <tool> <input>` lines naming what it
  is blocked on (verified for Claude Code).
- `--turns 1 --tools brief` shows how the agent got there, such as whether it
  ran the tests; a larger `--turns` reaches further back.
- Grok, and sessions whose log cannot be read, fall back to the pane's
  scrollback, which has no turns: `--final` and `--turns` print its last 40
  lines and say so on stderr.
- `send --wait` delivers the message and then waits exactly as step 2 does,
  with the same words and exit codes, so a quick reply is not missed.
- Send a follow-up only after the previous turn ended. A message sent to a
  `running` agent is queued for after the turn by Claude Code, Codex, and
  OpenCode, and typed into the pane with an unverified result for Grok and
  Pi; `wait` then reports the current turn's end first.
- `send` refuses a `waiting` session, whose dialog the text would answer.
- A message from a tracked agent starts with
  `[agent-berth message from <id> (<provider>)]` and a blank line, so the
  receiver knows who to `reply` to.

## 4. Identify yourself and reply

Inside an agent, `agent-berth self` prints that agent's id, read from the
provider's environment (Claude Code's `CLAUDE_CODE_SESSION_ID`, Pi's
`PI_SESSION_ID`) or from `$TMUX_PANE`. A Claude Code subagent shares its
parent's environment, so `self` there names the parent session.

```sh
agent-berth reply "Tests pass; the changelog is updated."    # to the agent that started you
agent-berth reply --wait "Should I also bump the version?"   # and wait for its answer
```

- `reply` sends to the delegator named by `AGENT_BERTH_DELEGATOR` and
  behaves exactly like `send` to that id: the same flags, the waiting
  refusal, and the exit codes.
- Report a result or ask a question with `reply` instead of waiting to be
  polled, then keep working or end your turn.

## 5. Stop a delegate

```sh
agent-berth stop "$id"
```

It kills the tmux pane showing the session, and refuses when no pane shows
it (exited, desktop, Paseo, or a background tab) or when the pane also hosts
other sessions, which would end with it. The session stays stored and
searchable, `logs` still reads its transcript, and `agent-berth rm "$id"`
hides it.

## Session fields

`agent-berth search "$id" --json` prints the session. The fields worth
reading:

| Field | Meaning |
| --- | --- |
| `id` | Stable session id that every command takes |
| `status` | `running`, `waiting`, `done`, or `idle` |
| `provider` | `claude`, `codex`, `grok`, `opencode`, or `pi` |
| `title`, `memo`, `cwd` | Detected title, user-set note, and working directory |
| `tmux_pane` | `id`, `session`, `window`, `window_name`, `path`, and `pid` of the pane; absent when none shows the session |
| `turns_ended` | Monotonic count of finished turns, which `wait` compares with `--after` |
| `delegator` | Id of the session that started this one with `new` |

## Troubleshooting

- `new` fails with "tmux is required": install tmux, or start the agent
  manually.
- `new --wait` times out or exits 1: inspect the pane with
  `tmux capture-pane -p -t "%N"` (the pane id is on the "started" line) and
  run `agent-berth doctor`. Hooks may be missing, the server may be stopped,
  or a Codex or Grok agent has no prompt yet. Once the agent has reported,
  `agent-berth search --tmux-pane "%N" --json` returns the session the pane
  shows now; OpenCode 1 and Pi do not report which session is in front, so
  their pane matches every session the process opened, newest first.
- `send` reports "is not the active session in a tmux pane" or "is in copy
  mode": bring the agent's tab to the front or leave copy mode; a missing
  `tmux_pane` in `agent-berth search "$id" --json` means the pane is gone.
- `reply` reports "no delegator": you were not started by `agent-berth new`;
  use `send <id>` with an id given in your prompt.
