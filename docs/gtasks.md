# Google Tasks

`gtasks` opens a TUI showing your default Google Tasks list as an expanded,
Markdown-style list with `- [ ]` and `- [x]` checkboxes. Child tasks use two spaces
of indentation per level, without tree connector lines. Parent tasks appear above their children, with descriptions
indented beneath each task's title. `gtasks tui <list-id>`
opens another list, and `gtasks list [list-id]` prints a nested Markdown todo list.
Both use Google OAuth directly; `gws` is no longer required.
The root shows the list ID beneath the breadcrumb. When you enter a task, its
ID and description appear there, above its children. Long descriptions are
shortened to keep the children and controls visible.

Start inside a matching task with `gtasks --cd "Project"` (or
`gtasks tui <list-id> --cd "Project"`). Matching is a case-insensitive substring
of task titles among the unfinished tasks. One match opens its child hierarchy;
multiple matches keep you at the root with the search filter applied so you can
select a parent. No matches also leaves the filter at the root; Esc clears it.

## Agent commands

```powershell
gtasks lists
gtasks lists --json
gtasks list --json
gtasks list --raw
gtasks list --cd "Project"
gtasks list --list LIST_ID --cd "Project" --json
gtasks add --title "New task" --notes "Description" --parent PARENT_ID --json
gtasks edit TASK_ID --title "Updated title" --notes "Updated description" --json
gtasks done TASK_ID --json
gtasks undone TASK_ID --json
```

All task commands default to the default list; use `--list LIST_ID` for another
list. `list` also accepts a positional list ID. `lists` fetches every page and
returns list IDs and names; its JSON output is an array of `{ "id", "name" }`.

`list --cd NAME` includes completed tasks in matching. It accepts a task ID,
then prefers a case-insensitive exact title match, then a unique substring
match. Missing or ambiguous names fail; ambiguity errors include the matching
IDs. Markdown output starts with the parent's title as an H1, its description,
then its child hierarchy. A task without children still returns its heading
and description. On a TTY, `list` pipes Markdown through glow when it is on
PATH; `--raw` prints the Markdown instead.

`list --json` returns `{ "listId", "parent", "tasks" }`. `parent` is the selected
Google task object, or `null` at the root. `tasks` is a flat array of Google task
objects, including IDs, titles, notes, status and parent IDs. With `--cd`, it
contains only descendants; parent links remain intact for rebuilding the tree.

`add`, `edit`, `done`, and `undone` return the resulting Google task object with
`--json`, or its ID and Markdown without it. `edit` changes only supplied
fields; `--notes ""` clears the description. `add` requires `--title`; omit
`--parent` to add at the root. Mutation targets and `--parent` use task IDs.

These commands read and write Google directly and wait for confirmation; they
do not read or modify the TUI's pending local queue. A running TUI picks up
server changes on its next refresh; pending local edits can overwrite those
same fields when synced. Agent commands never prompt for credentials or launch
sign-in: run `gtasks auth` separately first. JSON goes only to stdout, without
glow. Failures go to stderr and exit with code 1.

## Credentials

Enable the Google Tasks API in your OAuth client's Google Cloud project. A
**Desktop app** OAuth client works with the default sign-in flow. For a **Web
application** client, register `http://127.0.0.1:8765/` as an authorized redirect
URI and use `gtasks auth --port 8765`.

Create the gopass entry `key/cloud.google.com/gwscli` with this structure:

```text
YOUR_GOOGLE_OAUTH_CLIENT_SECRET
export_as: GWS_CLIENT_SECRET
GWS_CLIENT_ID: YOUR_CLIENT_ID.apps.googleusercontent.com
```

This matches `fpdotenv`: the first line exports as `GWS_CLIENT_SECRET`,
and the uppercase field exports as `GWS_CLIENT_ID`. Alternatively, put
the secret in a `GWS_CLIENT_SECRET: ...` field. An optional
`GOOGLE_TASKS_REFRESH_TOKEN: ...` field can seed an existing refresh token granted
the `https://www.googleapis.com/auth/tasks` scope for this same client.

From the public dotfiles repository:

```powershell
bun run ev-secrets
bun run src/gtasks.js auth
bun run src/gtasks.js
```

`ev-secrets [openai-entry]` imports Google Tasks credentials alongside OpenAI,
Moonshot, and Pushover. `ev-secrets --google-tasks [entry-path]` imports only
Google Tasks credentials. It saves
`google-tasks-client-id`, `google-tasks-client-secret`, and, if provided,
`google-tasks-refresh-token` under Bun Secrets service `me.iany.bin`. Reimporting
the same client preserves the saved refresh token unless the entry supplies one.
Changing clients clears the old refresh token.

Sign-in prints a Google authorization URL. Open it in your browser, grant access,
then return to the terminal. The callback listens only on `127.0.0.1`, validates
OAuth state, and uses PKCE. The refresh token is saved in the OS key store;
access tokens are refreshed automatically in memory. Starting the TUI without a
saved refresh token also starts sign-in. Use `gtasks auth` to sign in again after
revocation or expiry. No credentials are written into the repository.

The `GWS_CLIENT_ID`, `GWS_CLIENT_SECRET`, and optional
`GOOGLE_TASKS_REFRESH_TOKEN` environment variables override stored credentials,
unless `NO_SECRET_ENV_VAR` is set. `fpdotenv` emits POSIX shell assignments; on
PowerShell, use the key store importer above.

`bun run build` compiles the command to `dist/gtasks.exe` on Windows (or
`dist/gtasks` elsewhere). With `dist` on PATH, launch it as `gtasks`.
`bun run clear-secrets google-tasks` removes its stored credentials.

## Local storage and sync

The TUI opens its local cache immediately. Adds, edits, completion changes, and
deletions are saved to SQLite before appearing as saved, then sent to Google in
order by a background queue. Pending changes survive quitting and restarting.
SQLite is built into Bun; no extra dependency is required. The first launch
downloads the list in the background, and later launches can use it offline.

Caches live in `%LOCALAPPDATA%\gtasks` on Windows, or
`$XDG_DATA_HOME/gtasks` (default `~/.local/share/gtasks`) elsewhere. Each sign-in
and task list has a separate cache; only one TUI can open that cache at a time.
Signing in again with a different refresh token creates a separate cache.
`gtasks list` reads directly from Google, so it excludes pending local changes.

The sync status shows queued changes and errors. Failed requests retry with
increasing delays. After five consecutive failures, syncing pauses and asks
whether to reset the cache. **y** discards pending changes only after a fresh
server copy is fetched successfully. **n**, Enter, or Esc keeps your local data
and leaves syncing paused; **r** retries. Resetting does not clear credentials.
If a task insertion may have reached Google before its connection failed, it
is not sent again automatically, to avoid creating a duplicate. The same reset
prompt lets you reload Google's actual state.

## Controls

| Key | Action |
| --- | --- |
| Up/Down or k/j | Select a task |
| Enter, Right, or l | Enter the selected task and show its child hierarchy |
| Backspace, Left, or h | Return to the parent level |
| g / G | Select the first / last task |
| / | Search the current subtree, keeping matching tasks' ancestors visible |
| Enter / Esc while searching | Keep / cancel the search |
| V | Start visual selection; j/k extends it; V again leaves it |
| Esc while browsing | Clear the filter, visual selection, and yank/cut buffer |
| a | Add a task at the current level in the multiline editor |
| o / O | Add a task after / before the selected task |
| e | Edit the selected task's title and description in the same editor |
| y | Yank (copy) the selected task(s) and their children |
| d | Cut the selected task(s); paste moves them |
| D | Delete the selected task(s) and their children; y confirms |
| p / P | Paste after / before the selected task |
| Space | Toggle completed / incomplete |
| x / u | Mark done / undone |
| c | Toggle between undone tasks only and all tasks |
| m | Print the focused, filtered list as raw Markdown |
| r | Retry pending changes and refresh from Google |
| q or Ctrl+C | Quit |

The editor uses one input: its first line is the title, and the remaining lines
are the description. Leading and trailing blank lines are removed from the
description; internal blank lines and indentation are preserved. **Enter** adds
a newline, **Ctrl+S** saves, and **Esc** or **Ctrl+C** cancels editing. Node's
readline handles text editing and terminal redraw, including Left/Right,
Home/End, Backspace/Delete, Ctrl+A/E, and Ctrl+W/U. Up/Down moves between input
lines, preserving the cursor column across short or blank lines. Editing prefills the existing
title and description. Removing
all description lines clears the saved description. Failed saves keep your draft.

Completed tasks are hidden by default. Press **c** to show them for reopening;
press it again to hide them. Undone children remain visible even if their parent
is completed. `gtasks list` still includes completed tasks. All pages are fetched,
including tasks completed in Google's apps. Search is limited to the current
subtree; entering or leaving a task updates the breadcrumb and restores the
previous level's filter and selection when returning. Adding a task clears the
filter so the new task is visible. Google enforces its restrictions on assigned
tasks and subtask creation; API errors appear in the TUI.

API references: [tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list),
[tasks.insert](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/insert),
and [desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app).
