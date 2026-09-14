# Change tasks

```sh
gtasks add --title 'Task' --notes 'Description' --due 2026-09-14 --parent PARENT_ID --json
gtasks edit TASK_ID --title 'Updated' --notes 'Updated description' --due tomorrow --json
gtasks move TASK_ID --parent PARENT_ID --previous SIBLING_ID --json
gtasks move TASK_ID --root --list LIST_ID --json
gtasks done TASK_ID --json
gtasks undone TASK_ID --json
```

These commands return the resulting Google task object with `--json`. Capture
an added task's returned ID before using it as a target or parent.

## Add and edit

`add` requires `--title`; omit `--parent` to add at the list root. `edit` changes
only supplied fields. Supplying `--notes` replaces the entire description, so
preserve existing content when the user requests a partial change.
`--notes ""` clears notes; `--due ""` clears the date.

Write titles and notes as Markdown, preserving links, emphasis, lists, and code.
The title is one line; additional content belongs in notes.

`--due` accepts `YYYY-MM-DD`, `today`, or `tomorrow`. Google Tasks stores dates
only; Markdown renders them as `[[YYYY-MM-DD]]`.

## Move

`move TASK_ID` requires exactly one destination: `--parent PARENT_ID` or `--root`.
It uses Google's same-list move API, preserving the task ID. `--previous TASK_ID`
places it after another sibling in the destination; omit it to place first.
`--list LIST_ID` defaults to `@default`. All IDs must exist in that list. Self or
descendant parenting, a missing task/parent, and a previous task that is the target
or not a destination sibling fail before any write. Validation reads the current
list first; concurrent changes and Google's task restrictions can still cause an
API error. `--json` returns the server's task object; errors emit no success result.

There is no noninteractive delete command. Explain this limitation when relevant;
completion is not a substitute for deletion.
