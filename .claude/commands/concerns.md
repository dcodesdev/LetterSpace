---
description: Read the root CONCERNS.md (plus any stray per-plan copies), report everything numbered and sorted by importance (critical first), keep only entries that are still real concerns, re-group the file by importance (critical, high, medium, low), and fold any stray copies back into the root file
---

Report what the loop has flagged for the user, most important first.

Read `CONCERNS.md` — things needing attention, half-finished work, suspicious
code.

It is a project-wide file kept at the repo root — one `CONCERNS.md` for the
whole project, never one per plan. Older runs did write per-plan copies, so also
sweep for any `CONCERNS.md` left under `plans/` and read those too — their
entries are folded back into the root file below.

If none exist, say so and stop.

Then, before writing anything, **verify each entry against the current code**.
The file is appended over many iterations and goes stale: the code may already
have been fixed, or the file/symbol may be gone. Drop entries that no longer
apply, and merge duplicates that say the same thing.

Keep only concerns: something the user still needs to look at. The file
accumulates other prose over the iterations — documentation, summaries of
finished work, notes explaining that a spec or a doc was edited, changelog-style
narration. Accurate or not, that prose belongs elsewhere, so drop it here.

Rank every surviving entry by importance:

1. **Critical** — data loss, broken builds, security, anything actively wrong.
2. **High** — likely to bite soon, or blocking work.
3. **Medium** — worth a decision from the human (trade-offs, tooling choices).
4. **Low** — nice-to-haves, cleanups.

Output one section per severity, highest first, skipping empty severities.
**Number every entry**, counting up continuously across the whole report — the
numbering does not restart per section — so the user can refer to any concern by
its number. Each line is one short bullet: the concern in a clause, the
file/symbol it touches, and — where there is one — the concrete action to take.

```
## Critical
1. <what is wrong> — `path/to/file.ts:12`. <what to do about it>
2. <...>

## High
3. <...>
```

Close with a one-line count (`3 critical, 2 high, 5 medium, 4 low`) and, if any
entries were dropped as stale, one line saying how many and why.

Then **update the source file** so it stops going stale: delete every entry you
dropped — stale, or not a concern in the first place — and collapse duplicates
into the single clearest wording. Keep the surviving entries' wording intact;
you are pruning and reordering, not rewriting. If the root file ends up with no
entries left, leave the file in place with its heading.

**Rewrite the file grouped by importance** — the same ranking as the report.
Under the file's own heading, put a `## Critical`, `## High`, `## Medium` and
`## Low` section in that order, skipping the severities with no entries, and
list each entry under its severity, most important first within the section.
Importance is the only grouping the file has: where entries sit under phase,
plan, or iteration headings (`## Phase 2`, `## Phase 3`, …), fold them into the
severity sections and drop those headings.

**Everything ends up in the root file.** If the sweep found stray per-plan
copies, every surviving concern ends up in the single root `CONCERNS.md`. Create
the root file if it does not exist yet, merge the entries from the plan copies
into whatever it already holds (merging duplicates, keeping the wording intact
otherwise, and leaving the result grouped by importance under the same severity
headings — most impactful first). Where the origin matters, keep the plan name
in the entry.

Once an entry is safely in the root file, **delete the plan-level source file**
— the copies under `plans/*/CONCERNS.md` are removed entirely, not just emptied.
Write the root file before deleting the sources, so nothing is lost if you stop
halfway.

Say how many entries you removed, and which plan-level files you deleted after
merging them into the root.
