---
name: create-pr
description: Create PR
disable-model-invocation: true
---
# Create PR

## Overview

Use the gh command for ALL GitHub-related tasks including working with issues, pull requests, checks, and releases.

When the user asks you to create a pull request, follow these steps carefully:

1. You can call multiple tools in a single response. When multiple independent pieces of information are requested and all commands are likely to succeed, run multiple tool calls in parallel for optimal performance. Run the following commands in parallel to understand the current state of the branch since it diverged from the base branch:
   - Run a git status command to see all untracked files
   - Run a git diff command to see both staged and unstaged changes that will be committed
   - Check if the current branch tracks a remote branch and is up to date with the remote, so you know if you need to push to the remote
   - Run a git log command and `git diff [base-branch]...HEAD` to understand the full commit history for the current branch (from the time it diverged from the base branch)
2. Analyze all changes that will be included in the pull request, making sure to look at all relevant commits (NOT just the latest commit, but ALL commits that will be included in the pull request!!!), and draft a pull request summary
3. Create the PR with the summary and a title
   - Create new branch if needed
   - Push to remote with `-u` flag if needed
   - Create PR using `gh pr create`. Use a temp file for the body to ensure correct format. Avoid file name conflicts when creating multiple PRs concurrently.

Important: Return the PR URL when you're done, so the user can see it

## Template

Use the PR template @.github\pull_request_template.md if found.
