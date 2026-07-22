---
name: jrnl
description: Capture notes into your daily journal using the jrnl CLI
---

Use the `jrnl` CLI to append entries to your daily journal. The journal is a
Markdown file named `Journal YYYY-MM-DD.md` stored in `~/Dropbox/Brain/journal/`,
`~/Brain/journal/`, or `~/.journal/` (first found wins).

## Commands

`jrnl <title>` — Read stdin and append a timestamped entry with the given title.

Prefer a temp file or HEREDOC for the body to avoid escaping issues:

    cat <<'EOF' | jrnl "Auth refactor"
    Finished refactoring the auth module.
    Notes with "quotes" and $vars stay literal.
    EOF

    # or write body to a temp file, then:
    jrnl "Auth refactor" < /tmp/jrnl-body.md

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
