---
name: jrnl
description: Append an entry to the daily journal with the jrnl CLI. Use when asked to journal, log, note, or capture something, or to open or locate today's journal file.
---
# jrnl

Appends to `Journal YYYY-MM-DD.md` in `~/Dropbox/Brain/journal/`,
`~/Brain/journal/`, or `~/.journal/` (first found wins).

| Command | Effect |
|---|---|
| `jrnl <title>` | Append a timestamped entry, body read from stdin |
| `jrnl -c <title>` | Same, body read from the clipboard |
| `jrnl -e` | Open today's file in `$EDITOR` (default nvim), creating it |
| `jrnl -p` | Print the path to today's file |

With empty stdin, the title becomes the body and the heading gets no title.

Pipe the body in via HEREDOC or a temp file so quotes and `$` stay literal:

```bash
cat <<'EOF' | jrnl "Auth refactor"
Finished refactoring the auth module.
EOF
```

Entries land under an h3 heading (`### HH:MM <title>`), so format the body as
Markdown using h4 or deeper for any headings of its own.
