Create a git commit using the message format below.

## Commit Message

Analyze following to generate the commit message:

- `git status --short` (change overview)
- `git diff --staged` (primary input). If the diff lacks sufficient context to understand intent, examine the full file.
- `git branch --show-current` (ticket/feature context)
- `git log --oneline -n 5 --no-merges` (subject style reference).

### Message Format

```
<subject>

<body>

<further paragraphs>
```

## Rules

- Summarize the nature of the changes as `<subject>` (eg. new feature, enhancement to an existing feature, bug fix, refactoring, test, docs, etc.).
    - Ensure the subject accurately reflects the changes and their purpose (i.e. "add" means a wholly new feature, "update" means an enhancement to an existing feature, "fix" means a bug fix, etc.).
    - Subject is lowercase, no period at the end.
    - Follow this repository's commit subject style by checking the output `git log --oneline -n 5 --no-merges`.
    - Keep the subject within 72 characters
- Draft a concise (1-2 sentences) `<body>` that focuses on the "why" rather than the "what".
    - Body must use proper punctuation and capitalization like normal paragraphs.
- Add `<further paragraphs>` if necessary. Bullet points are OK.
- Wrap body and further paragraphs at 72 characters.
