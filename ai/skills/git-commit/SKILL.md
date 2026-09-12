---
name: git-commit
description: Create a git commit using this repo's message conventions
disable-model-invocation: true
---
# git commit

Commit the staged changes, using the message format below. If the staged diff
doesn't make the intent clear, read the full file; the branch name often
carries ticket/feature context.

## Message format

```
<subject>

<body>

<further paragraphs>
```

- **Subject** — lowercase, no trailing period, within 72 characters. Name the
  nature of the change precisely: "add" for a wholly new feature, "update" for
  an enhancement to an existing one, "fix" for a bug fix. Match the prevailing
  style in `git log --oneline -n 5 --no-merges`.
- **Body** — 1–2 sentences on the *why*, not the *what*. Normal punctuation and
  capitalization.
- **Further paragraphs** — only if needed. Bullets are fine.
- Wrap body and further paragraphs at 72 characters.

## Attribution

Only when the user asks to commit with AI attribution, add:

```
Assisted-by: AGENT_NAME:MODEL_VERSION [TOOL1] [TOOL2]
```

`AGENT_NAME:MODEL_VERSION` identifies the agent and model. The optional tools
are specialized analysis tools actually used (coccinelle, sparse, smatch,
clang-tidy); basic tooling (git, compilers, editors) is never listed.

Example: `Assisted-by: Claude:claude-opus-5 coccinelle sparse`
