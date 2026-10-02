---
name: new-plan
description: "Use this when the user wants to create a new plan, start a new feature, begin a new project, or says 'new plan'. This skill defines a plan, writes a SPEC.md and PROGRESS.md into a timestamped plans/ directory, and updates PROMPT.md frontmatter to point to the new plan so the Ralph loop picks it up."
---

# New Plan

## Overview

Create a structured project plan by defining a plan, then write it to disk and wire it up to PROMPT.md.

## The Process

**The order of these steps matters.** Updating `PROMPT.md` must always be the
very last step — only after `SPEC.md` and `PROGRESS.md` are fully written. A
running loop picks up the new plan the moment `PROMPT.md` points at it, and a
half-written plan would start executing.

**1. Understand what the user wants to build:**

- Work out the scope, constraints, and success criteria of the request
- Ask about anything genuinely ambiguous that would change the shape of the
  plan — but **only if necessary**
- Ask through whatever mechanism this harness gives you: a question tool if you
  have one, whatever ask block the host app renders, otherwise plain prose in
  your reply
- Necessary means: two readings of the request lead to materially different
  plans, and no sensible default picks between them. Otherwise pick the default,
  record it under `## Constraints` in the spec, and carry on
- Keep it to a couple of decisions at most. Never interrogate the user, and
  never block on a question you could answer by reading the codebase
- If nobody is there to answer — an unattended loop, say — state the assumption
  in the spec instead

**2. Explore the codebase thoroughly:**

- Before writing any plan, explore the existing codebase well to understand the current architecture, patterns, conventions, and relevant code
- Read key files, understand the project structure, and identify where changes will need to be made
- This ensures the plan is grounded in reality and accounts for existing code, dependencies, and constraints
- Use this understanding to write phases and tasks that are specific to the actual codebase, not generic

**3. Scaffold the plan directory:**

Run the script bundled with this skill, passing only a short kebab-case name for
the plan (e.g. `auth-system`, `api-refactor`):

```bash
bash .claude/skills/new-plan/new-plan.sh <kebab-case-name>
```

It stamps the current date/time onto the directory, creates
`./plans/YYYY-MM-DD-HHMM-<name>/`, and prints the created path. It creates the
directory only — you write `SPEC.md` and `PROGRESS.md` into it yourself. Use
that path for everything below — never hand-compute the timestamp yourself.

**4. Fill in the SPEC.md:**

Create `./plans/YYYY-MM-DD-HHMM-<name>/SPEC.md`:

```markdown
# <Plan Name>

## Goal

One paragraph describing what we're building and why.

## Phases

### Phase 1: <Name>

- [ ] Task 1
- [ ] Task 2

### Phase 2: <Name>

- [ ] Task 1
- [ ] Task 2

(as many phases as needed — keep them small and focused)
(if a phase has too many tasks, split it into sub-phases: 2.a, 2.b, 2.c, etc.)

### Phase N: Documentation (always the last phase)

- [ ] Update existing docs affected by this feature (`README.md`, `CLAUDE.md`, `./docs/`, bundled skill templates)
- [ ] Create a new doc at `./docs/<feature>.md` if no existing doc covers it
- [ ] Do both when the feature both changes existing behavior and adds something new

## Constraints

- Any technical constraints, dependencies, or requirements

## Success Criteria

- How do we know this is done?
```

**5. Create the PROGRESS.md:**

Create `./plans/YYYY-MM-DD-HHMM-<name>/PROGRESS.md` alongside the spec:

```markdown
# Progress

## Completed Phases

(none yet)

## Current Phase

Not started.

## Notes
```

**6. Update PROMPT.md (always last):**

Do this last, after `SPEC.md` and `PROGRESS.md` are complete — never before or in between. Then update the frontmatter in `./PROMPT.md` to point to the new plan:

```yaml
---
plan: plans/YYYY-MM-DD-HHMM-<name>
---
```

The loop will automatically pick up the new plan by watching todo.md for unticked tasks.

## Key Principles

- **One phase = one iteration** — each phase should be completable in a single Ralph loop run
- **Split large phases** — if a phase would have too many tasks (e.g. implementing 20 API routes), break it into sub-phases like Phase 2.a, 2.b, 2.c, 2.d with ~5 tasks each. Each sub-phase should still be completable in one iteration.
- **Small and concrete** — tasks should be specific, not vague
- **Ordered by dependency** — earlier phases should not depend on later ones
- **PROMPT.md last** — never point `PROMPT.md` at the plan until every plan file is written
- **YAGNI** — don't plan features that aren't needed yet
- **Docs last** — the final phase of every plan MUST be a documentation phase. Update existing docs where they cover the touched behavior, create a new doc under `./docs/` when the feature isn't covered anywhere, or do both. Never end a plan without it.
