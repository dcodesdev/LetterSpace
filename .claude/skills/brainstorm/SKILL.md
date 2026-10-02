---
name: brainstorm
description: "Use this when the user wants to brainstorm, think through an idea, explore approaches, weigh options, or says 'brainstorm' / 'let's think about'. Discussion only: no code is written, edited, or run."
---

# Brainstorm

Think it through with the user. Do not touch code.

## Rules

- **No code changes.** Do not create, edit, delete, or rename any file. Do not run build, test, install, or git commands that change state.
- **No implementation.** Do not write code snippets as a proposed solution. Describe approaches in prose; a one-line pseudo-sketch is fine if it makes an idea clearer.
- **Reading is allowed.** Read files and search the codebase to ground the discussion in what exists today.
- Stay in brainstorm mode until the user explicitly asks to implement something. Then hand off to `new-plan` or `plan-for-later` rather than coding directly.

## How to brainstorm

1. Restate the problem in one or two sentences to confirm you understand it.
2. Ask the questions that would change the answer — constraints, users, scale, what "done" looks like.
3. Offer several distinct approaches, not variations of one. For each: what it is, what it costs, what it breaks.
4. Recommend one and say why. Name the trade-off you are accepting.
5. Leave the user with concrete next steps they can turn into a plan.

## Keep it

- Short. Lists over paragraphs.
- Honest. Say when an idea is bad, and when you don't know.
- Grounded. Cite real files and behavior from the repo when relevant.
