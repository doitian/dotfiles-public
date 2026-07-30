---
name: add-stacked-pr-breadcrumbs
description: Generate a stacked PR breadcrumbs block to add at the beginning of a PR body
disable-model-invocation: true
---
# Add Stacked PR Breadcrumbs

Generate a stacked PR breadcrumbs block to add at the beginning of a PR body.

## Instructions

Use `gh stack view --json` to get the stack. The `.branches` array is ordered from bottom (closest to trunk) to top; each entry has a `pr.number` (omitted if the branch has no PR). Generate the breadcrumbs in this exact format:

```markdown
> [!IMPORTANT]
> This is a stacked PR:
> - #<base_pr>
> - #<current_pr> :point_left:
> - #<child_pr>
```

The list lines can be generated with:

```bash
gh stack view --json | jq -r --argjson current <pr_number> '.branches[] | select(.pr != null) | "> - #\(.pr.number)\(if .pr.number == $current then " :point_left:" else "" end)"'
```

`<pr_number>` is the number of the PR being edited — `--argjson current` passes it to jq as `$current`, and the filter appends `:point_left:` to the line whose `.pr.number` matches it. Get it with `gh pr view --json number -q .number` when on the PR's branch.

Use `gh` to add the generated breadcrumbs block to the PR. If the PR already has a breadcrumbs block, replace it with the new one. Use a temp file for the PR body to ensure correct format.

### Rules

1. List PRs as a flat list in stack order (bottom to top, as given by `.branches`) — there is only one chain, so no nesting
2. The current PR (the one being created/edited) should have `:point_left:` at the end
3. Always start with the `> [!IMPORTANT]` callout
4. Always include the header line `> This is a stacked PR:`
5. Each PR number should be prefixed with `#`
6. All lines must start with `>` to maintain the blockquote format

### Example with 3 PRs in stack

If `gh stack view --json` returns branches with PRs #948, #950, and current PR #951

Output:

```markdown
> [!IMPORTANT]
> This is a stacked PR:
> - #948
> - #950
> - #951 :point_left:
```

### Example with 2 PRs in stack

If `gh stack view --json` returns branches with PRs #948, and current PR #950

Output:

```markdown
> [!IMPORTANT]
> This is a stacked PR:
> - #948
> - #950 :point_left:
```
