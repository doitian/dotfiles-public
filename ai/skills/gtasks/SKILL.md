---
name: gtasks
description: >
  Use the gtasks CLI in non-interactive mode to list, add, edit, complete, or
  reopen, move, or filter Google Tasks. Use when asked to inspect or change Google Tasks,
  including parent/child tasks, without opening the TUI. Also use for GTD task
  maintenance: capture, clarify, next-action selection, and weekly reviews.
---

# gtasks

Manage Google Tasks with the `gtasks` CLI. Never open the TUI (`gtasks`,
`gtasks tui`) or run `gtasks auth` unless the user asks.

These commands talk to Google directly and wait for confirmation. They do not
read or write the TUI's local queue. Failures go to stderr and exit 1. If a
command fails because no credentials are stored, tell the user to run
`gtasks auth`; do not prompt for or enter credentials yourself.

## Skill subcommand: gtd

For `$gtasks gtd …` or a request to maintain Google Tasks using GTD, read
[references/gtd.md](references/gtd.md). Examples: `$gtasks gtd capture …`,
`$gtasks gtd clarify`, `$gtasks gtd next`, and `$gtasks gtd review`.
`gtd` is an agent workflow within this skill; do not execute `gtasks gtd` in
the shell. Use the CLI commands below to carry out the requested workflow.

GTD rules: distinguish project outcomes from available next actions; keep
waiting and someday items separate; use real dates rather than invented
urgency; preserve one task per action and its project membership; review
active projects for next actions. Follow the user's existing conventions or
use the reference defaults. Load the reference only when GTD mode is relevant.

## Commands

Prefer `--json` so IDs are available for later commands. Use `--raw` when the
user should see Markdown. Default `list` output uses glow on a TTY.

```powershell
gtasks lists --json
gtasks list --json
gtasks list --raw
gtasks list --status needsAction --token "#next" --token "@computer" --json
gtasks list --search "proposal" --json
gtasks list --cd "Project" --json
gtasks list --list LIST_ID --cd "Project" --json
gtasks add --title "Task" --notes "Description" --due 2026-09-14 --parent TASK_ID --json
gtasks edit TASK_ID --title "Updated" --notes "Updated description" --due tomorrow --json
gtasks move TASK_ID --parent PARENT_ID --previous SIBLING_ID --json
gtasks move TASK_ID --root --list LIST_ID --json
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
- `add`, `edit`, `move`, `done`, and `undone` with `--json` return the Google task
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

Find IDs with `list --json` before mutating; never invent a task ID.

## List filters and moves

`list` accepts `--status needsAction|completed` (default: both), `--search TEXT`
(case-insensitive substring in title or notes), and repeatable `--token TOKEN`
(exact, case-sensitive hashtag or context in title or notes). All filters combine
with AND. Quote tokens in shells, for example `--token "#next" --token "@computer"`.
Tokens start with `#` or `@`, followed by Unicode letters, numbers, underscores,
or hyphens. Whitespace or punctuation separates tokens; letters, numbers,
underscores, hyphens, `#`, and `@` do not start a new token. Thus `(#next)` matches
`#next`, while `#next-step`, `#nextish`, and `mail@computer` do not match `#next`
or `@computer`. Empty search strings and malformed tokens fail.

Filters apply after `--cd` resolves against the full list and selects descendants.
Only matching tasks are returned: unmatched ancestors and descendants are not
included. JSON keeps the same `{ "listId", "parent", "tasks" }` shape and original
IDs/parent links, even when a parent is absent from `tasks`. The selected `--cd`
parent remains in `parent` and the Markdown heading regardless of filters.
Markdown shows matches whose immediate parents were omitted at the top level;
it nests matches whose parents also match. Without filters, output is unchanged.

`move TASK_ID` requires exactly one destination: `--parent PARENT_ID` or `--root`.
It uses Google's same-list move API, preserving the task ID. `--previous TASK_ID`
places it after another sibling in the destination; omit it to place first.
`--list LIST_ID` defaults to `@default`. All IDs must exist in that list. Self or
descendant parenting, a missing task/parent, and a previous task that is the target
or not a destination sibling fail before any write. Validation reads the current
list first; concurrent changes and Google's task restrictions can still cause an
API error. `--json` returns the server's task object; errors emit no success result.

Tags such as `#next`, `#waiting`, `#someday`, `@computer`, and `@calls` are ordinary
text conventions chosen by the user. The CLI imposes no GTD taxonomy, priorities,
or additional metadata storage.
