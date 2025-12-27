# Add Stacked PR Breadcrumbs

Generate a stacked PR breadcrumbs block to add at the beginning of a PR body.

## Instructions

Use `git branch-tree` to figure out the branch hierarchy. Then lookup corresponding PR numbers for each branch and generate the breadcrumbs in this exact format:

```markdown
> [!IMPORTANT]
> This is a stacked PR:
> - #<base_pr>
>     - #<current_pr> :point_left:
>         - #<child_pr>
```

Use `gh` to add the generated breadcrumbs block to the PR. If the PR already has a breadcrumbs block, replace it with the new one. Use a temp file for the PR body to ensure correct format.

### Rules:

1. Each level of the stack should be indented with 4 spaces more than the previous level
2. The current PR (the one being created/edited) should have `:point_left:` at the end
3. Always start with the `> [!IMPORTANT]` callout
4. Always include the header line `> This is a stacked PR:`
5. Each PR number should be prefixed with `#`
6. All lines must start with `>` to maintain the blockquote format

### Example with 3 PRs in stack:

If the user provides: base PR #948, then #950, and current PR #951

Output:
```markdown
> [!IMPORTANT]
> This is a stacked PR:
> - #948
>     - #950
>         - #951 :point_left:
```

### Example with 2 PRs in stack:

If the user provides: base PR #948, current PR #950

Output:
```markdown
> [!IMPORTANT]
> This is a stacked PR:
> - #948
>     - #950 :point_left:
```
