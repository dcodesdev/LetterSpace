---
name: document
description: "Use this when writing or updating documentation — a README, docs/ page, CLAUDE.md, changelog entry, or doc comments — or when the user says 'document this'. Defines the house style for docs in this project: short, factual, task-first."
---

# Document

How to write docs in this project. Keep them short — a doc nobody finishes is a doc nobody reads.

## Where things go

- `README.md` — what the project is, install, one working example. Nothing else.
- `CLAUDE.md` — commands, flags, structure, conventions. Update it whenever behavior changes.
- `docs/<topic>.md` — one file per topic that needs more than a paragraph.
- Code comments — only for *why*, never *what*. Delete comments that restate the code.

## How to write

- Lead with the task: "Run X to do Y", not "This section describes...".
- Use the imperative and the present tense. Second person for the reader, no "we".
- Every claim must be true of the code as it is now — check before writing. No aspirational docs.
- Show a real, runnable command or snippet instead of describing one.
- Short sentences. Cut adjectives, hedges, and preamble ("simply", "just", "powerful", "seamless").
- Prefer a list over a paragraph, and a table over a list when there are three or more columns of facts.
- Link to a file with a path (`packages/core/prompt.ts`) instead of pasting large blocks of it.

## Structure of a doc

1. One-line statement of what it covers.
2. The shortest path to doing the thing.
3. Flags/options/edge cases.
4. Troubleshooting, only if there are known failure modes.

## Don't

- Don't duplicate content across files — put it in one place and link.
- Don't document internals users can't reach, or plans that aren't built yet.
- Don't leave stale docs behind: when you change behavior, update or delete the doc in the same change.
