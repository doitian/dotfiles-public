---
name: gtd
description: >
  Maintain a GTD workflow in Google Tasks: capture inputs, clarify projects and
  next actions, choose available work, track waiting items, and conduct weekly
  reviews. Use for GTD task organization or review requests; use gtasks for
  direct task operations that do not need GTD decisions.
---

# GTD

Manage the user's Google Tasks with a consistent GTD workflow. Entry points
include `$gtd capture …`, `$gtd clarify`, `$gtd next`, and `$gtd review`;
natural-language requests for those workflows also apply. These are agent
requests, not shell commands.

Before reading or changing Google Tasks, load the [gtasks skill](../gtasks/SKILL.md)
for CLI commands, IDs, filtering, edits, errors, and sync behavior. It owns the
tool instructions; this skill owns workflow decisions. If already loaded, use
its instructions without reloading. Its compatibility route back here does not
require another load. Do not substitute another task service when gtasks is
unavailable; report the missing dependency and continue any planning possible.

## Task model

Keep each action in one place, under its project when applicable. Context views
are filters over those tasks, not duplicate copies. Respect an established
user taxonomy; otherwise use these plain-text conventions in titles:

| Meaning | Representation |
| --- | --- |
| Unprocessed input | `#inbox`, normally at the list root |
| Finishable outcome requiring multiple actions | Parent with `#project`; completion criteria in notes |
| Concrete action available now | `#next`, under its project or standalone |
| Dependency on another person or event | `#waiting`; notes record who/what, requested date, and known follow-up date |
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

## Capture and clarify

Capture requested thoughts promptly, preserving meaning and source links.
Do not require a project, context, estimate, or deadline to capture an item.
Use the user's selected list, or the CLI default when none is specified.

For clarification, read current tasks and process inputs in manageable batches:

- Determine whether each item is actionable. Non-actionable material belongs
  in reference, Someday/Maybe, or trash according to the user's intent.
- For actionable work, identify the desired outcome and the next visible
  action. If multiple actions are required, identify or create its project
  within the requested scope.
- A practical action taking under two minutes can be done during clarification
  when execution is authorized. Otherwise record a next action, track a
  delegated dependency, or record genuinely date-specific work.
- Replace `#inbox` with the appropriate state and move the original action
  under its project when appropriate. Preserve IDs rather than copying and
  deleting; follow the tool skill for supported moves.

Ask for missing intent or decisions that materially change commitments; apply
clear requested changes directly. A review request alone does not authorize
deleting commitments, activating every idea, or contacting other people.
Never mark discarded work completed merely to simulate deletion. Consult the
tool skill for supported operations and explain any relevant limitation.

## Choose the next action

Check date-specific commitments and follow-ups, then select available actions
by context, time available, energy, and importance to the user's goals. Use
duration/energy estimates only when useful; do not invent a priority score.
Waiting, someday, project containers, and dependent future steps are not
available next actions.

Use the tool skill to query the relevant state and context markers. Read enough
of the full task hierarchy to understand project membership and find untagged
work; an empty tag query does not prove the user has no work. Include each
relevant list when the system spans lists. Do not inherit a parent's state or
context implicitly.

## Completion

When the user reports completion or authorized work provides evidence, mark
the action done and identify newly available next actions. A completed child
does not establish that the project's outcome is achieved. Preserve notes,
links, and checked checklist entries using the tool skill's edit rules.
Summarize the changes and any unresolved decisions.

## Weekly review

For `$gtd review` or a weekly review request, read
[references/review.md](references/review.md). Keep this procedure unloaded for
ordinary capture, clarification, and next-action requests.

## Shared state

Google Tasks holds the shared task state. Record durable decisions and project
criteria in task notes so agents on other computers can recover the context.
Use the same account and conventions across computers; conversation history
is not shared task state. Follow the tool skill for fresh reads and sync limits.

## Sources

Adapted from David Allen Company's [GTD overview](https://gettingthingsdone.com/what-is-gtd/),
[clarification guidance](https://gettingthingsdone.com/2011/10/gtd-best-practices-process-part-2-of-5/),
and [action selection criteria](https://gettingthingsdone.com/2023/01/choosing-what-to-do/).
The tags and parent-task representation are conventions for this setup, not GTD requirements.
