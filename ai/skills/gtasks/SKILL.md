---
name: gtasks
description: Read and change Google Tasks with the noninteractive gtasks CLI, including task hierarchy and filters.
---

# gtasks

Use `gtasks` for Google Tasks operations. Commands contact Google directly and
wait for the server result; they do not use the TUI's local queue. Pending TUI
edits can overwrite the same fields when synced.

## Read what the operation needs

- For list discovery, task lookup, subtree navigation, or filtering, read
  [references/read.md](references/read.md).
- For adding, editing, completing, reopening, or moving tasks, read
  [references/change.md](references/change.md). Load the read reference as
  needed to locate targets.
- For GTD workflow requests, including “gtasks gtd …”, follow the
  [gtd skill](../gtd/SKILL.md). This is an agent request; the executable has
  no `gtd` command.

## Shared behavior

Prefer `--json` for operations: results include IDs. Use `--raw` for Markdown.
Task commands default to `@default`; select another list with `--list LIST_ID`.
Use IDs from current task data for mutations and parents, not titles or invented
IDs. Reuse suitable current data rather than fetching it again for each step.

Use noninteractive commands. Open the TUI (`gtasks`, `gtasks tui`) or start
`gtasks auth` only when requested. If credentials are missing, tell the user to
run `gtasks auth`; do not handle credentials yourself.

Failures go to stderr and exit 1. Report the operation's result or specific
failure; an unsuccessful command is not confirmation of a change.
