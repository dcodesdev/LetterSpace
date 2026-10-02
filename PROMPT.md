---
plan: todo.md
---

- Study the plan file and pick the first uncompleted phase and implement it.
- If the plan file is `todo.md`, only do ONE task (`- [ ]` item) at a time. Complete it, tick it, then stop.
- Otherwise, complete ALL `- [ ]` checkboxes within that phase and tick them off (`- [x]`) in the SPEC.md file as you finish each one. If the phase has sub-phases (e.g., "Phase 2.a"), complete one sub-phase fully and tick all its boxes.
- Save progress in PROGRESS.md (same dir as the plan file) when done. Skip this if the plan file is `todo.md`.
- When every item in the plan is done, update the `plan` reference in `PROMPT.md` frontmatter to `todo.md`. If it's already `todo.md` then do nothing.
- If the plan is wrong or impossible, STOP and set `is_halt` to `true` in PROMPT.md at root dir.
- There is NO user to ask and no question tool available here: this runs unattended, in a loop, with nobody reading the output until it is over. Never ask a question, never wait for input, never end a turn on a question. Where a choice is genuinely ambiguous, pick the most reasonable option, write down the assumption you made, and carry on — record it in CONCERNS.md if the user should revisit it.
- Maintain a `CONCERNS.md` at the root dir to record concerns — things the user should know about: things that need attention, half-finished work, suspicious code, or anything you're unsure about. Keep entries short, one per line.
  Every line in CONCERNS.md is a concern: something the user still needs to look at. Documentation, changelogs, summaries of what you changed, and notes about edits to a doc or spec belong in their own files.
  Group the whole file by importance under `## Critical`, `## High`, `## Medium`, `## Low` headings in that order, skipping the severities with no entries — insert each new concern under its severity heading, most important first within the group, and re-group the rest. Importance is the only grouping the file has.
- NEVER commit to git. Do not run `git commit`, `git push`, or any other command that writes to git history — leave all changes in the working tree.
- When you're done, stage the changes you made in this session with `git add <paths>`, listing only the files you touched this session. Never use `git add -A`, `git add .`, or any other blanket stage — unstaged changes from earlier sessions must stay unstaged, and anything already staged before this session must stay staged and untouched (never `git reset` or unstage). Staging only; still never commit.
