---
description: Write a new plan for later — same as new-plan, but queued in todo.md instead of pointing PROMPT.md at it now
argument-hint: "<what to build>"
---

Create a plan for: `$ARGUMENTS`

Use the **new-plan** skill (`.claude/skills/new-plan/SKILL.md`) — explore the
codebase first, then write `plans/YYYY-MM-DD-HHMM-<name>/SPEC.md` and an empty
`PROGRESS.md` beside it, exactly as that skill describes, documentation phase
last.

Two deviations from the skill:

- **Do not touch `PROMPT.md`.** Leave its `plan:` frontmatter alone, whatever it
  currently points at. The loop is working through `todo.md` and must not be
  redirected mid-task.
- **Queue the plan in `todo.md` instead — as the very last step.** Write
  `SPEC.md` and `PROGRESS.md` first and only then touch `todo.md`, so a half-
  written plan is never queued. Re-read `todo.md` immediately before editing (it
  changes under you), then append one unticked line to the **first** section — if the
  file has a `## DO NOT DO ANY TASK BELOW THIS` heading, the line goes above it,
  never below:

  ```
  - [ ] <Plan name> — update `PROMPT.md` to point to `plans/YYYY-MM-DD-HHMM-<name>` (<one-clause reminder of what it is for>).
  ```

  The entry says to _point PROMPT.md at the plan_, not to follow the plan: it is
  a task whose whole job is handing the loop over to the new spec.

Finish by reporting the plan path and the todo line you added.
