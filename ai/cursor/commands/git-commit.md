# Git Commit

This slash command is a Git commit helper that:

1. Runs pre-commit checks by default (linting, building, generating docs)
2. Automatically stages files if none are staged
3. Analyzes code changes to suggest potential commit splits
4. Creates commits using the message format below.

## Commit Messages

For each commit, analyze the following to generate the commit:

- `git diff --staged` (primary input). If the diff lacks sufficient context to understand intent, examine the full file.
- `git status --short` (change overview)
- `git branch --show-current` (ticket/feature context)
- `git log --oneline -n 5 --no-merges` (style reference).

### Format

```
<title>

<body>
```

## Rules

- Encourages "atomic commits" with focused, logical changes and offers guidelines for splitting complex commits.
- Summarize the nature of the changes as title (eg. new feature, enhancement to an existing feature, bug fix, refactoring, test, docs, etc.).
    - Ensure the title accurately reflects the changes and their purpose (i.e. "add" means a wholly new feature, "update" means an enhancement to an existing feature, "fix" means a bug fix, etc.).
    - Title is lowercase, no period at the end.
    - Follow this repository's commit message style by checking the output `git log --oneline -n 5 --no-merges`.
    - Keep the title within 72 characters
- Draft a concise (1-2 sentences) body that focuses on the "why" rather than the "what".
    - Wrap body lines at 72 characters.
    - Body must use proper punctuation and capitalization like normal paragraphs.
- Ensure it accurately reflects the changes and their purpose
