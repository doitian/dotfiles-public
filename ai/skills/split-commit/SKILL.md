---
name: split-commit
description: Split working tree changes into up to five atomic commits. Use when asked to split, break up, or stage uncommitted work into separate commits.
---
# Split commit

Split the current working tree into **at most 5** atomic commits.

## Grouping rules

Each commit must be:

- **Self-contained** — the repo builds and works at every commit.
- **One concern** — refactor, feature, bugfix, tests, or docs; never a mix.
- **Ordered** — foundational changes before the changes that depend on them.

If the work is genuinely one concern, make one commit; don't split artificially.
If there are more than 5 logical groups, merge the least distinct ones.

## Workflow

1. Present the plan as a numbered list — files/hunks per commit, plus a draft
   subject — and wait for approval. The user may want a different split.
2. Stage and commit each group in order, using the **git-commit** skill for each
   message. Use `git add -p` (driven non-interactively) when a file's hunks
   belong to different commits.
3. Show `git log --oneline` for the new commits.

Don't push unless asked.
