---
name: ship-it
description: Wrap up the current task — commit, push, open a PR if requested, close out the source task, reply to the requester, and clean up
disable-model-invocation: true
---
# Ship it

Finish the current task end to end. Work through the steps in order and skip
any that don't apply. Stop and report if a step fails rather than pressing on.

## 1. Commit and push

- Review `git status` and the diff. Commit only the task's changes; leave
  unrelated work in the tree untouched and mention it.
- Commit using the **git-commit** skill, or **split-commit** if the changes
  span several concerns.
- Push the branch, with `-u` if it has no upstream. If on the default branch
  and a PR is wanted, branch first.

## 2. Pull request

Only if the user asked for one. Create it with the **create-pr** skill and
link the source task (issue, ticket, thread) in the body.

## 3. Close the source task

If the task came from an external system — GitHub issue, Jira, Notion, Google
Tasks, etc. — mark it done there, with a short comment linking the commit or
PR where the system supports it. Don't close it if the PR still needs review
and the system tracks review separately (e.g. move to "In Review" instead).

## 4. Reply to the requester

If someone other than the user requested the work (a Slack thread, email,
issue comment), reply in the same place: what changed, the commit/PR link,
and anything they need to do. Keep it brief. Show the draft to the user
before sending unless they already approved sending.

## 5. Clean up

Revert everything done only to get the task done:

- Temporary files, scripts, logs, and scratch output.
- Debug code, stray `console.log`/prints, and commented-out experiments.
- Configuration or environment changes (env vars, local config overrides,
  feature flags, installed tools) made for the task.
- Background processes, dev servers, containers, and worktrees you started.
- Merged or abandoned local branches created for the task.

Look before deleting; leave anything you didn't create.

## Done when

Report a short summary: commit(s), PR URL, task status, reply sent, and what
was cleaned up — plus anything skipped and why.
