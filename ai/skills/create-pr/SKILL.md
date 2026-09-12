---
name: create-pr
description: Create a pull request for the current branch
disable-model-invocation: true
---
# Create PR

Use `gh` for all GitHub work (issues, PRs, checks, releases).

Summarize every commit on the branch since it diverged from the base — not just
the latest one. Push with `-u` first if the branch has no upstream.

Create the PR with `gh pr create`, passing the body via a temp file (use a
unique name so concurrent PR creation doesn't collide).

## Body

- Follow @.github\pull_request_template.md if present.
- Note in the summary that the content is AI-generated.

## Done when

The PR exists and you have returned its URL to the user.
