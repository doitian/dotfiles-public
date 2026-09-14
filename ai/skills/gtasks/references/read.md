# Read and filter

```sh
gtasks lists --json
gtasks list --json
gtasks list --raw
gtasks list --list LIST_ID --cd 'Project' --json
gtasks list --status needsAction --token '#next' --token '@computer' --json
gtasks list --search 'proposal' --json
```

`lists --json` returns `{ "id", "name" }[]`. `list` also accepts a positional
list ID. Default list output uses glow on a TTY; `--raw` prints Markdown.

`list --json` returns `{ "listId", "parent", "tasks" }`. At the root, `parent`
is null. `tasks` is a flat array of Google task objects with IDs, titles, notes,
status, due dates, and parent IDs. Rebuild hierarchy from parent links.

`--cd NAME` selects a parent's descendants. It matches a task ID first, then a
case-insensitive exact title, then a unique substring; completed tasks are
included in matching. Ambiguous names fail with matching IDs to choose from.
The selected task is in `parent`; only descendants are in `tasks`.

## Filters

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

Tags and contexts are ordinary text chosen by the user, not native task metadata.
