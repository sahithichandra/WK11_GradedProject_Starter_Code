---
description: Implement a feature by following its plan, tests-first, on existing patterns
argument-hint: <path to the plan file, e.g. specs/bookmarks-plan.md>
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(npm test:*), Bash(npm run:*), Bash(git:*), TodoWrite
---

Implement the feature described by the plan at **$ARGUMENTS**, following it step by step.

## Rules

- **Follow the plan's order** (bottom-up). Track progress with a todo list — one step in progress at
  a time.
- **Tests-first.** For each step, write the failing test named in the plan, then the minimal code to
  pass it. Match the existing test style (Vitest; Supertest + in-memory Mongo on the backend; RTL +
  MSW on the frontend).
- **Stay on-pattern.** Obey `CLAUDE.md`: backend layering (routes→controllers→services→models), the
  `{success,message,data}` envelope, `createAppError(msg, status)` thrown from services, the
  author/admin ownership check; frontend config→service→slice→component, per-request token headers,
  envelope-unwrapping in services, `react-bootstrap` + `react-icons`. Read the sibling file before
  writing a new one and copy its conventions.
- **Reuse, don't reinvent.** If the plan says a capability already exists, wire to it — don't rebuild it.
- **Don't break anything.** After each meaningful chunk, run the relevant package's `npm test`. The
  full backend and frontend suites must stay green when you finish.
- **UI updates immediately** via Redux state — never a full page reload.

## Finish

1. Run `npm test` in **both** packages and report the results (paste the summary lines).
2. Summarize what changed (files created/modified) and which acceptance criteria are now satisfied.
3. List anything deferred or any criterion not yet verifiable by automated test (for manual check).
Do not commit unless asked.
