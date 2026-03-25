---
name: split-commit
description: Split working tree changes into up to five atomic commits, each with a message generated using the git-commit skill
---
Split the current working tree changes into up to five atomic, logically self-contained commits.

## Workflow

### 1. Analyze changes

Run the following to understand the full scope of uncommitted work:

- `git status --short`
- `git diff` (unstaged changes)
- `git diff --staged` (already staged changes)
- `git branch --show-current`
- `git log --oneline -n 5 --no-merges`

If a diff lacks sufficient context to understand intent, examine the full file.

### 2. Plan the split

Group changes into **up to 5** atomic units. Each unit must be:

- **Self-contained** — the repo builds/works after each commit.
- **Logically cohesive** — one concern per commit (e.g. refactor, feature, bugfix, tests, docs).
- **Ordered sensibly** — foundational changes first, dependent changes later.

Present the plan to the user as a numbered list showing which files/hunks go into each commit and a draft subject line. Wait for approval before proceeding.

### 3. Execute commits

For each planned commit, in order:

1. Stage only the relevant files or hunks (`git add <path>` or `git add -p` with automated expect/input when partial staging is needed).
2. Use the **git-commit** skill to generate the commit message from the staged diff.
3. Create the commit.
4. Verify with `git status --short` that no unintended changes remain staged before moving to the next commit.

### 4. Verify

After all commits are created, run `git log --oneline -n <number of commits created> --no-merges` and present the result to the user.

## Rules

- Never combine unrelated changes in a single commit.
- If all changes are logically one concern, a single commit is fine — do not split artificially.
- Do not exceed 5 commits. If there are more than 5 logical groups, combine the least distinct ones.
- Never leave the working tree in a broken state between commits.
- Do not push to the remote unless the user explicitly asks.
