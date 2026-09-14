# GTD mode

Use this workflow for the `gtd` skill subcommand, for example `$gtasks gtd
capture …`, `$gtasks gtd clarify`, `$gtasks gtd next`, or `$gtasks gtd review`.
These are requests to the agent. Execute the ordinary CLI commands documented
in SKILL.md; the executable has no `gtd` subcommand.

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
  deleting. The move command only works within one list.

Ask for missing intent or decisions that materially change commitments; apply
clear requested changes directly. A review request alone does not authorize
deleting commitments, activating every idea, or contacting other people.
The CLI has no delete command: never mark discarded work completed merely to
simulate deletion. Explain that limitation when disposal is requested.

## Choose the next action

Check date-specific commitments and follow-ups, then select available actions
by context, time available, energy, and importance to the user's goals. Use
duration/energy estimates only when useful; do not invent a priority score.
Waiting, someday, project containers, and dependent future steps are not
available next actions.

```sh
gtasks list --status needsAction --token '#next' --token '@computer' --json
gtasks list --status needsAction --token '#waiting' --json
gtasks list --status needsAction --token '#inbox' --json
```

All filters combine with AND and match title or notes. Unmatched parents are
omitted from filtered results, although parent IDs remain. Read the full list
to reconstruct project context and find untagged work; an empty tag query does
not prove the user has no work. Inspect each relevant list separately when
the system spans lists. Do not inherit a parent's state or context implicitly.

## Completion and weekly review

When the user reports completion or authorized work provides evidence, mark
the action done and identify newly available next actions. A completed child
does not establish that the project's outcome is achieved. Preserve existing
notes, links, and checked checklist entries; editing notes replaces the entire
field. Read current IDs and content before changes, and summarize results.

For a weekly review:

1. Gather loose inputs and mental reminders; clarify the inbox.
2. Review completed and open actions and past/upcoming calendar information
   that is accessible or supplied. Identify missing inputs explicitly.
3. Review waiting items and follow-ups without assuming silence means completion.
4. Inspect each active project's outcome and available next actions. Flag
   projects with none; distinguish those blocked entirely on others. Propose
   clarification rather than inventing work to fill the gap.
5. Review relevant checklists, areas of responsibility, and Someday/Maybe for
   commitments to activate, change, or drop based on user intent.

Finish with useful next actions, unresolved decisions, and a concise account of
changes. Task update timestamps alone do not prove that a project is neglected.
Schedule recurring reviews only when the user requests scheduling.

## Across computers

Google Tasks holds the shared task state, including marker text and notes.
Use the same account and skill conventions on each computer. Agent conversation
history is not shared task state: record durable decisions in task notes.
CLI commands read Google directly; pending TUI edits are local and can overwrite
the same fields after syncing. Refresh current state before maintenance.

## Sources

This workflow adapts David Allen Company's [GTD overview](https://gettingthingsdone.com/what-is-gtd/),
[clarification guidance](https://gettingthingsdone.com/2011/10/gtd-best-practices-process-part-2-of-5/),
[action selection criteria](https://gettingthingsdone.com/2023/01/choosing-what-to-do/),
and [weekly review checklist](https://gettingthingsdone.com/wp-content/uploads/2016/04/GTD-WeeklyReview.pdf).
The tags and parent-task representation are conventions for gtasks, not GTD requirements.
