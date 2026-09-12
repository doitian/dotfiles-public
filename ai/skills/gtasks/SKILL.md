---
name: gtasks
description: >
  Use the gtasks CLI in non-interactive mode to list, add, edit, complete, or
  reopen Google Tasks. Use when asked to inspect or change Google Tasks,
  including parent/child tasks, without opening the TUI.
---

# gtasks

Manage Google Tasks with the `gtasks` CLI. Never open the TUI (`gtasks`,
`gtasks tui`) or run `gtasks auth` unless the user asks.

These commands talk to Google directly and wait for confirmation. They do not
read or write the TUI's local queue. Failures go to stderr and exit 1. If a
command fails because no credentials are stored, tell the user to run
`gtasks auth`; do not prompt for or enter credentials yourself.

## Commands

Prefer `--json` so IDs are available for later commands. Use `--raw` when the
user should see Markdown. Default `list` output uses glow on a TTY.

```powershell
gtasks lists --json
gtasks list --json
gtasks list --raw
gtasks list --cd "Project" --json
gtasks list --list LIST_ID --cd "Project" --json
gtasks add --title "Task" --notes "Description" --due 2026-09-14 --parent TASK_ID --json
gtasks edit TASK_ID --title "Updated" --notes "Updated description" --due tomorrow --json
gtasks done TASK_ID --json
gtasks undone TASK_ID --json
```

All task commands default to `@default`. Use `--list LIST_ID` for another list.
`list` also accepts a positional list ID.

## IDs and `--cd`

- `lists --json` returns `{ "id", "name" }[]`.
- `list --json` returns `{ "listId", "parent", "tasks" }`. `parent` is null at
  the root. `tasks` is a flat array with `id`, `title`, `notes`, `status`, `due`,
  and `parent`. With `--cd`, it is only descendants.
- `add`, `edit`, `done`, and `undone` with `--json` return the Google task
  object. Capture `id` from `add` before using `--parent` or mutations.
- Mutation targets and `--parent` must be task IDs, not titles.
- `list --cd NAME` matches a task ID, then a case-insensitive exact title, then
  a unique substring. Completed tasks are included. Ambiguous names fail and
  print matching IDs; use one of those IDs.

## Edit and add

- `add` requires `--title`. Omit `--parent` to add at the root.
- `edit` changes only supplied fields. `--notes ""` clears the description.
  `--due ""` clears the due date. `--due` accepts `YYYY-MM-DD`, `today`, or
  `tomorrow`. Google Tasks stores dates only. Markdown shows due dates as
  `[[YYYY-MM-DD]]`.
- Write `--title` and `--notes` as Markdown (links, emphasis, lists, code). Do
  not escape or flatten them to plain text. Title is one line; put the rest in
  notes.

## Workflow

1. `gtasks list --json` or `gtasks list --cd "Name" --json` to find IDs.
2. Mutate with those IDs.
3. If `--cd` is ambiguous, pick an ID from the error and retry.

Do not invent task IDs. Do not use IFTTT or other webhooks for Google Tasks.
