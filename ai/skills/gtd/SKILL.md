---
name: gtd
description: Organize the default Google Tasks list using GTD for capture, inbox clarification, next-action selection, and commitment reviews.
---

# GTD

Maintain clear outcomes and available next actions in Google Tasks. Requests
include “Capture this in my GTD inbox”, “Clarify my inbox”, “Choose my next
action”, and “Run my weekly review”.

For Google Tasks reads or changes, use the [gtasks skill](../gtasks/SKILL.md).
For workflow advice alone, no tool instructions are needed. Reuse skills already
loaded; the gtasks compatibility route does not require loading this file again.

## Scope

GTD reads and changes only the default Google Tasks list (`@default`). Use
`gtasks list --json` to start; omit `--list` or use `--list @default` for task
operations. Do not enumerate or inspect other lists as part of capture,
triage, action selection, or reviews. Other lists remain outside this workflow.

## Choose the relevant workflow

- Capture or clarify inputs: [references/clarify.md](references/clarify.md).
- Select work or handle completion: [references/actions.md](references/actions.md).
- Conduct a weekly review: [references/review.md](references/review.md).

## Task model

Keep each action in one place, under its project when applicable. Context views
are filters over those tasks, not duplicate copies. Respect an established
user taxonomy; otherwise use these plain-text conventions in titles:

| Meaning | Representation |
| --- | --- |
| Unprocessed input | `#i`, normally at the list root |
| Finishable outcome requiring multiple actions | Parent with `#project`; completion criteria in notes |
| Concrete action available now | `#now`, under its project or standalone |
| Dependency on another person or event | `#later`; notes record who/what, requested date, and known follow-up date |
| Possible future commitment | `#someday` |
| Place, tool, or person needed | Optional `@computer`, `@calls`, `@home`, `@errands`, or user-chosen context |

Use one workflow state per action. Preserve unrelated labels such as `#work`.
An ongoing responsibility is an area, not a project with a finish line. Future
dependent steps stay in project notes until actionable; several independent
next actions can be available together. Keep substantial reference material
outside Tasks and link to it from notes.

Use `due` for actual deadlines or genuinely day-specific actions. Appointments
with times belong in a calendar. Keep a follow-up/review date explicit in notes
when it is not a deadline. Do not invent dates, readiness, or commitments.

## Decisions and shared state

Apply clear requested changes through completion. Ask for missing intent when
it affects commitments; retain existing authorization rather than asking again.
Mark actions complete on the user's report or evidence from authorized work.
A review identifies decisions; it does not by itself authorize contacting people
or dropping commitments. Never use completion to simulate discarding an item.

Record durable decisions and project criteria in task notes so another agent
or computer can recover the context. End with changes made and unresolved
choices relevant to the request.

The tags and parent-task representation are local conventions, not GTD requirements.
Source: [GTD overview](https://gettingthingsdone.com/what-is-gtd/).
