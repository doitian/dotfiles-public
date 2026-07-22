---
name: jrnl
description: Capture notes into your daily journal using the jrnl CLI
---

Use the `jrnl` CLI to append entries to your daily journal. The journal is a
Markdown file named `Journal YYYY-MM-DD.md` stored in `~/Dropbox/Brain/journal/`,
`~/Brain/journal/`, or `~/.journal/` (first found wins).

## Commands

`jrnl <title>` — Read stdin and append a timestamped entry with the given title.
Pipe or type the entry body, then press Ctrl+D (or Ctrl+Z Enter on Windows).
Example:

    echo "Finished refactoring the auth module" | jrnl "Auth refactor"

`jrnl -c <title>` — Same as above, but reads the body from the clipboard
instead of stdin.

`jrnl -e` — Open today's journal file in `$EDITOR` (defaults to nvim). The
file is created with a template if it doesn't exist.

`jrnl -p` — Print the path to today's journal file and exit.

## Formatting

Entries are appended under an h3 heading (`### HH:MM <title>`). Format the body
in Markdown. Because each entry starts at h3, use h4 (`####`) or deeper for any
headings within the body.

## When to use

- User asks to save, note, capture, record, log, or journal something
- User wants to open or edit the journal
- User wants to know where the journal file is
- Wrap complex content in a here-string or pipe it. If the body is short, pass
  it as a here-string: `@"
  body
  "@ | jrnl "title"`
