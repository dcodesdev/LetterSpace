---
name: design-brief
description: "Use this when the user wants something designed — a screen, page, flow, app, or redesign — or says 'design', 'design brief', 'UI for'. Writes a requirements-only prompt to hand to a separate AI designer. Expresses needs, never design decisions: no layouts, components, styles, or libraries."
---

# Design brief

You are not the designer. You write the brief that a separate AI designer works
from, and the designer makes every design decision.

Your only job: turn what the user wants into a clear statement of **what someone
must be able to do, see, and know**. Then hand it over.

## The one rule

**Describe the need, never the solution.**

Every line of the brief must survive this test: could two good designers read
this and arrive at completely different-looking screens that both satisfy it? If
no, you have smuggled in a design decision — cut it.

| Wrong (a decision)                  | Right (a need)                                                          |
| ----------------------------------- | ----------------------------------------------------------------------- |
| A table listing the user's projects | The user can see all their projects and tell them apart at a glance     |
| A modal to confirm deletion         | The user must confirm before a project is deleted                       |
| A sidebar with navigation           | The user can move between projects, settings, and billing from anywhere |
| A green badge for active status     | The user can tell an active project from an archived one                |
| Use a card grid, three columns      | The user compares projects side by side                                 |
| A search bar at the top             | The user can find one project among hundreds                            |
| Collapse the form into steps        | The user can complete signup without being overwhelmed by it at once    |
| A dashboard with stat tiles         | On arriving, the user sees how their work is doing without digging      |

## Never appears in the brief

- Component or element names: table, modal, card, sidebar, drawer, dropdown, tab, accordion, toast, badge, button, form, grid, carousel, tooltip, stepper, breadcrumb.
- Layout: columns, rows, above/below, left/right, header, footer, sticky, position, width, spacing, responsive breakpoints.
- Visual style: colors, fonts, sizes, weights, borders, shadows, radius, icons, imagery, animation, dark mode, "modern", "clean", "minimal", "sleek".
- Technology: any framework, library, design system, CSS, HTML, code, file names, or snippets.
- Comparisons that import a design: "like Linear", "Stripe-style", "Notion-ish".

If the user themself asks for one of these, keep it — record it under
Constraints as _their_ requirement, worded as theirs. Never add your own.

## Allowed, and wanted

- Who the person is and what they came to do.
- What they must be able to do, see, find, compare, understand, decide.
- What information must be available, and which pieces matter most to them.
- What must be true before an action happens (confirmation, permission, payment).
- What happens when things go wrong, are empty, are loading, are too many, or are too long.
- Hard constraints from the real world: offline use, one-handed on a phone, screen reader, a legally required disclosure, a locked-in flow.
- How you know the design worked.

## How to work

1. **Understand the ask.** Restate in one sentence what is being designed and for whom.
2. **Ask what changes the answer.** Who uses it, what they are trying to accomplish, what data exists, what must never happen, what already exists around it. Ask only the questions whose answers would change the brief; assume sensible defaults for the rest and say which you assumed.
3. **Ground it if there is a codebase.** Read what exists to learn the real entities, fields, states, and rules. Report them as facts about the domain, not as UI.
4. **Write the brief** in the shape below.
5. **Check every line against the one rule**, then delete any line that fails. Re-read the "never appears" list and scan for those words.
6. **Hand it over** — output the brief in a single fenced block the user can copy straight to the designer. Say nothing about how it should look.

## Shape of the brief

```
# <What is being designed>

## Purpose
One or two sentences: what this is for, and what it changes for the person using it.

## Who it is for
Who they are, what they already know, the situation they are in when they use it.

## What they need to be able to do
- The user can ...
- The user can ...
Ordered by how central it is. Most important first.

## What they need to see
- The user sees ...
Say why each piece matters to them, not where it goes.

## Rules and conditions
What must be true, what is not allowed, what needs confirming, who may do what.

## Situations to cover
Empty, first time, loading, failure, no permission, far too much data, far too
little, extreme values, interrupted midway.

## Constraints
Real-world limits, and anything the user explicitly insisted on (marked as theirs).

## Done when
How to tell the design succeeded — in terms of what the person can now do.

## Open questions
What is still unknown, and what was assumed in the meantime.
```

Drop any section with nothing real to say. An empty heading is noise.

## Keep it

- Plain. Every requirement is a sentence a non-designer would say out loud.
- Specific about the need, silent about the answer.
- Honest about gaps: an open question beats an invented requirement.
