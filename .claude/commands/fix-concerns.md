---
description: Turn every entry in the root CONCERNS.md that needs no decision from the user into a new plan (via the new-plan skill), and report what still needs a human
---

Plan fixes for the entries in the root `CONCERNS.md` that need no decision.
If the file does not exist or has no entries, say so and stop.

First **verify each entry against the current code**. The file goes stale: an
entry whose code is already fixed, or whose file/symbol is gone, gets no task —
delete it from `CONCERNS.md` now.

Then sort every remaining entry into one of two buckets:

- **Decision-free** — there is one obvious fix, a reasonable maintainer would
  not want to be asked, and it does not change user-facing behaviour, a public
  contract, or a deliberate trade-off. Typical examples: a missing test, a stale
  or duplicated doc, a misplaced constant, dead code, a missing guard or a
  wrong hardcoded path, a duplicated message.
- **Needs a decision** — the entry names options, asks "worth picking one",
  describes something as deliberate or by design, would change behaviour users
  rely on, adds or removes a dependency or a tool, or cannot be verified here
  (for example it needs Docker, a real `claude`, or a machine to power off).
  Leave these alone.

When unsure, it needs a decision. Never plan a fix that does something the
entry warns against.

If no entry is decision-free, say so and stop without writing a plan.

Otherwise use the **new-plan** skill (`.claude/skills/new-plan/SKILL.md`) to
write the plan, named `fix-concerns`. Do not fix anything yourself — the loop
does the work. Do not ask the user questions; the triage above already made the
calls. In the `SPEC.md`:

- Group related concerns into phases, small enough for one iteration each.
- Write each task so the loop can act on it without further context: quote the
  concern, name the files and symbols, and say what the fix is.
- Each task that fixes a concern also deletes that entry from `CONCERNS.md`, or
  rewrites it to say only what is still open.
- The last phase runs `bun run check` (or the project's equivalent) and fixes
  anything the earlier phases broke.
- List the "needs a decision" entries under a **Not in scope** heading so the
  loop does not pick them up.

Finish with a short report:

```
## Planned
1. <concern in a clause> — <the fix, and its phase>

## Needs a decision
2. <concern in a clause> — <the decision the user has to make>
```

Number continuously across both sections, then give the plan path and one line:
how many were planned, how many were stale, and how many need a decision.
