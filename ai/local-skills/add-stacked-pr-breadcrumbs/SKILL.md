---
name: add-stacked-pr-breadcrumbs
description: Add or refresh the stacked-PR breadcrumbs block at the top of a PR body
disable-model-invocation: true
---
# Add stacked PR breadcrumbs

Put this block at the very top of the PR body, replacing any existing
breadcrumbs block:

```markdown
> [!IMPORTANT]
> This is a stacked PR:
> - #948
> - #950 :point_left:
> - #951
```

One flat list, in stack order (bottom to top), every line prefixed with `>`,
every PR number prefixed with `#`, and `:point_left:` on the PR being edited.

## Generating it

`gh stack view --json` returns `.branches` ordered bottom to top; entries have
`.pr.number`, omitted when the branch has no PR yet.

```bash
current=$(gh pr view --json number -q .number)
gh stack view --json | jq -r --argjson current "$current" \
  '.branches[] | select(.pr != null) | "> - #\(.pr.number)\(if .pr.number == $current then " :point_left:" else "" end)"'
```

Update the PR with `gh pr edit`, passing the body via a temp file so the
formatting survives.
