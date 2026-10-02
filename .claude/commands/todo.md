---
description: Append a task to todo.md
argument-hint: "<task>"
---

Add this task to `todo.md`: `$ARGUMENTS`

First read enough of the code to know whether the task is actually doable as
stated and where it lands. Keep this cheap — grep for the relevant files, skim
them, stop once you can write a task the loop can act on.

- **Straightforward** — the target is unambiguous and there is one obvious way
  to do it: just append the line, no questions.
- **Has real nuances** — the task could be done in materially different places
  or ways, or it conflicts with what the code already does: ask the user
  _before_ writing anything to `todo.md`, then fold the answer into the queued
  line. Ask through whatever mechanism this harness gives you: a question tool
  if you have one, whatever ask block the host app renders, otherwise plain
  prose in your reply.

Be conservative about asking. Only ask when a wrong guess would send the loop
down the wrong path; otherwise pick the obvious reading and note the assumption
in the task line. If the task is impossible as stated, say so instead of queuing
it.

Re-read `todo.md` first — it changes under you — then append one unticked line
to the **first** section. If the file has a `## NEVER DO ANY TASK BELOW THIS`
heading (or any similar "do not do" heading), the line goes **above** it, never
below.

```
- [ ] <the task, one clear sentence>
```

Write the task as an instruction the loop can act on without further context:
name the files or commands involved where you know them. Do not reword it into
something larger than what was asked, and do not do the work — only queue it.

Finish by printing the line you added.
