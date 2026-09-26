# Google Tasks

`gtasks` opens a TUI showing your default Google Tasks list as an expanded,
Markdown-style list with `- [ ]` and `- [x]` checkboxes. The TUI shows two
levels at a time: the current tasks and their direct children. Enter a task to
see the next level. Child tasks use two spaces of indentation per level, without
tree connector lines. Parent tasks appear above their children, with descriptions
indented beneath each task's title. Descriptions show at most two
lines with blank lines trimmed; the focused task shows its full description. A blank line
separates tasks. `gtasks tui <list-id>`
opens another list, and `gtasks list [list-id]` prints a nested Markdown todo list.
Both use Google OAuth directly; `gws` is no longer required.
The root shows the list ID as `^id` beneath the breadcrumb. When you enter a
task, it remains selectable as the first list item, with its description under
the title and its children below. With that parent selected, **a**/**o** add a
child at the end, **O** adds one at the start, and **p**/**P** paste as children.

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
gtasks list --status needsAction --token "#next" --token "@computer" --json
gtasks list --search "proposal" --json
gtasks list --cd "Project"
gtasks list --list LIST_ID --cd "Project" --json
gtasks add --title "New task" --notes "Description" --due 2026-09-14 --parent PARENT_ID --json
gtasks edit TASK_ID --title "Updated title" --notes "Updated description" --due tomorrow --json
gtasks move TASK_ID --parent PARENT_ID --previous SIBLING_ID --json
gtasks move TASK_ID --root --list LIST_ID --json
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
objects, including IDs, titles, notes, status, due dates, and parent IDs. With `--cd`, it
contains only descendants; parent links remain intact for rebuilding the tree.

`add`, `edit`, `move`, `done`, and `undone` return the resulting Google task object with
`--json`, or its ID and Markdown without it. `edit` changes only supplied
fields; `--notes ""` clears the description; `--due ""` clears the due date.
`--due` accepts `YYYY-MM-DD`, `today`, or `tomorrow`. Google Tasks stores dates
only. Markdown shows due dates as `[[YYYY-MM-DD]]`. `add` requires `--title`; omit
`--parent` to add at the root. Mutation targets and `--parent` use task IDs.

These commands read and write Google directly and wait for confirmation, while
the TUI applies changes locally first and syncs them in the background. A
running TUI picks up server changes on its next refresh; pending local edits
can overwrite those same fields when synced. Agent commands never prompt for credentials or launch
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
unless `NO_SECRET_ENV_VAR` is set. `fpdotenv` detects the invoking shell and
emits POSIX assignments or PowerShell `$env:` assignments accordingly; the key
store importer above is the alternative that avoids environment variables.

`bun run build` compiles the command to `dist/gtasks.exe` on Windows (or
`dist/gtasks` elsewhere). With `dist` on PATH, launch it as `gtasks`.
`bun run clear-secrets google-tasks` removes its stored credentials.

## Local updates and sync

The TUI applies adds, edits, completion changes, moves, and deletions to its
in-memory copy immediately, then sends them to Google in order in the
background, so the interface never blocks on the network. Pending changes live
in memory only; quitting before they sync discards them. The first launch
downloads the list in the background.

The sync status line shows queued changes and errors. After a failure, syncing
stops; fix the problem and press **r** to retry. `gtasks list` reads directly
from Google, so it excludes pending local changes.

## Controls

Task titles and descriptions wrap at word boundaries, with indented continuation lines.
Words and URLs wider than the available space split across lines.

| Key | Action |
| --- | --- |
| Up/Down or k/j | Select a task |
| Ctrl+F / Ctrl+B | Scroll down / up one page, including within long descriptions |
| g? | Toggle help (hidden by default) |
| Enter, Right, or l | Enter the selected task and show its child hierarchy |
| Backspace, Left, or h | Return to the parent level |
| gg / G | Select the first / last task |
| gx | Open the selected task in the default browser |
| gf | Open found links, including a Keep note; choose if several |
| gp | Copy a prompt for the current task or visual selection: `Work on gtasks item ID1, ID2.` |
| g, | Copy the selected task ID |
| / | Search the current subtree, keeping matching tasks' ancestors visible |
| Enter / Esc while searching | Keep / cancel the search |
| V | Start visual selection; j/k extends it; V again leaves it |
| Esc while browsing | Clear the filter, visual selection, and yank/cut buffer |
| a | Add a task at the current level in `$EDITOR` |
| o / O | Add a task after / before the selected task in `$EDITOR` |
| e or Ctrl+E | Edit the selected task's title and description in `$EDITOR` |
| s | Set or clear the selected task's due date |
| y | Yank (copy) the selected task(s) and their children |
| Y | Copy the current task and children, or the visual selection, as Markdown with IDs |
| d | Cut the selected task(s); paste moves them |
| D | Delete the selected task(s) and their children; y confirms |
| p / P | Paste after / before the selected task |
| Space | Toggle completed / incomplete |
| x / u | Mark done / undone |
| . | Toggle between undone tasks only and all tasks |
| , | Toggle task IDs (`^id`) on each row |
| m | Print the focused, filtered list as raw Markdown |
| r | Retry failed syncs and refresh from Google |
| q or Ctrl+C | Quit |

**a**, **o**, **O**, **e**, and **Ctrl+E** open `$EDITOR` (default: `nvim`). The
first line is the title and the remaining lines are the description, with a blank
line between them. Leading and trailing blank lines are removed from the
description; internal blank lines and indentation are preserved. Save and exit to
apply changes; exiting without changes or with an error leaves the task
unchanged. After a failed save, press any key to retry the preserved draft in
`$EDITOR`, or **Esc** to discard it. Set `EDITOR` to the editor executable or a
wrapper script.

Due dates appear as `[[YYYY-MM-DD]]` after the title. Press **s** to set one;
**Enter** saves, **Esc** cancels, and an empty value clears it. `today` and
`tomorrow` are accepted. Google's API stores the date only.

Completed tasks are hidden by default. Press **.** to show them for reopening;
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
