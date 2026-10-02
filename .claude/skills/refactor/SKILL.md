---
name: refactor
description: "Use this when the user wants to refactor the codebase, clean up code, reduce duplication, or says 'refactor' / 'new refactor'. This skill explores the codebase to find concrete refactoring opportunities (DRY, file splitting, shared helpers), then writes a phased SPEC.md and PROGRESS.md into a timestamped plans/ directory and points PROMPT.md at it so the Ralph loop can execute the refactor phase by phase."
---

# Refactor

## Overview

Create a structured refactor plan by exploring the codebase for concrete opportunities to reduce duplication, shorten files, and split responsibilities — then write a phased plan to disk and wire it up to PROMPT.md so the Ralph loop can execute it one phase at a time.

This skill is a sibling of `new-plan`: same output shape (`plans/YYYY-MM-DD-HHMM-<name>/SPEC.md` + `PROGRESS.md`, PROMPT.md frontmatter updated), but the content is specifically a refactor plan grounded in real findings from the codebase.

## The Process

**1. Explore the codebase thoroughly before writing anything:**

The plan must be grounded in real findings, not generic advice. Before writing the SPEC.md, do a real exploration pass:

- Map the project structure: top-level directories, packages, entry points
- Read key files end to end so you understand current patterns and conventions
- Identify duplicated logic, copy-pasted blocks, near-identical functions across files
- Identify long files (rough heuristic: > ~300 lines, or files mixing many concerns)
- Identify files that mix multiple responsibilities and could be split into focused modules/components
- Identify utilities that exist inline but should be shared (DRY candidates)
- Note existing conventions (naming, module layout, test layout) so the refactor stays consistent

Record specific file paths and line ranges in the plan. Vague tasks like "clean up utils" are not acceptable — every task should name the files involved.

**2. Be conservative — do not force refactors:**

- Only propose changes where the benefit is clear: real duplication, real complexity, real readability win
- If two pieces of code look similar but serve different purposes, leave them alone
- Premature abstraction is worse than duplication — three similar lines is fine
- Skip churn-only changes (renames, restyling) unless the user asked for them
- Prefer small, contained refactors over sweeping restructures
- Do not change behavior. Refactors must be behavior-preserving unless the user explicitly asks otherwise

**3. Break the work into phases / chunks:**

Each phase should be small enough to complete in a single Ralph loop iteration and behavior-preserving on its own. Suggested chunking strategies (pick what fits):

- By area: one package or directory per phase
- By concern: extract shared helpers first, then split files, then thin out call sites
- By file: one large file's split per phase

If a phase has many tasks, split it into sub-phases (Phase 2.a, 2.b, ...) of ~5 tasks each.

**4. Write the SPEC.md:**

Create the plan file at `./plans/YYYY-MM-DD-HHMM-<name>/SPEC.md` where:

- `YYYY-MM-DD-HHMM` is the current date and time (e.g. `2026-04-27-1530`)
- `<name>` is a short kebab-case name like `refactor-core`, `refactor-cli-commands`, `refactor-ui`

Use this structure:

```markdown
# <Refactor Name>

## Goal

One paragraph: what we're refactoring and why. Call out the user-visible promise — usually "no behavior change, just cleaner internals."

## Findings

Concrete observations from exploration. Each finding names files and what's wrong:

- `path/to/file.ts` — 600+ lines mixing X, Y, Z; split candidates: ...
- `pkg/a/foo.ts` and `pkg/b/bar.ts` share ~40 lines of nearly identical logic — extract to `pkg/shared/...`
- ...

## Phases

### Phase 1: <Name>

- [ ] Specific task naming files (e.g. "Extract `formatError` from `apps/cli/commands/run.ts` and `apps/cli/commands/build.ts` into `packages/core/errors.ts`")
- [ ] ...

### Phase 2: <Name>

- [ ] ...

(as many phases as needed — keep them small, focused, and behavior-preserving)
(if a phase has too many tasks, split into 2.a, 2.b, ...)

## Constraints

- Behavior must be preserved (unless the user explicitly relaxes this)
- All existing tests must continue to pass; type-check must stay green
- Follow existing project conventions (module layout, naming)
- No drive-by feature changes, no dependency upgrades

## Success Criteria

- Tests + type-check pass at the end of every phase
- Targeted files are measurably shorter / less duplicated
- No behavior change observable from the outside
```

**5. Update PROMPT.md:**

Update the frontmatter in `./PROMPT.md` to point to the new plan:

```yaml
---
plan: plans/YYYY-MM-DD-HHMM-<name>
---
```

The Ralph loop will pick up the new plan and execute one phase per iteration.

**6. Create an empty PROGRESS.md:**

In the same directory as the spec:

```markdown
# Progress

## Completed Phases

(none yet)

## Current Phase

Not started.

## Notes
```

## Key Principles

- **Findings first** — no phase makes it into the plan without a concrete finding behind it
- **Behavior-preserving** — refactors do not change semantics
- **One phase = one iteration** — each phase is completable in a single Ralph loop run
- **Split large phases** — break into sub-phases (2.a, 2.b, ...) of ~5 tasks each
- **DRY where it pays off** — only extract shared code when the duplication is real and the abstraction is obvious
- **Split files where it helps** — only split when a file mixes clearly separable concerns
- **YAGNI** — do not refactor speculatively for hypothetical future needs
