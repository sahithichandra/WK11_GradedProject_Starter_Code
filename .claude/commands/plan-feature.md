---
description: Turn a reviewed spec into an ordered, bottom-up implementation plan
argument-hint: <path to the spec file, e.g. specs/bookmarks-spec.md>
allowed-tools: Read, Grep, Glob, Write, Edit
---

Turn the spec at **$ARGUMENTS** into a concrete, ordered implementation plan.

## Steps

1. **Read the spec** at `$ARGUMENTS` in full, plus `CLAUDE.md`. Re-open the specific existing files
   the spec says you will copy/extend, so each step can name real symbols and follow real patterns.

2. **Write the plan** to `specs/<same-kebab-name>-plan.md` as an **ordered, bottom-up** sequence —
   data model → service → controller → route → tests (backend), then config → service → slice →
   component/page → tests (frontend). The frontend should be buildable against a working backend.

   Each step must include:
   - **What** — the exact file and the change (function/component name, signature, key logic).
   - **Pattern to follow** — the existing file:symbol it mirrors (e.g. "mirror `handleVote` in
     `services/voteService.js`").
   - **Tests-first note** — the test to write before/with the step and the acceptance criterion
     (from the spec) it satisfies.
   - **Done-when** — a one-line verification (a passing test, or an observable UI behaviour).

3. **Add at the top:**
   - **Prerequisites** — anything that must be true first (seeded DB, both servers runnable).
   - **Build order rationale** — one or two sentences on why this order is safe (no forward deps).
   - **Capabilities reused** — bullet list of existing code being reused rather than rebuilt.

4. **Add at the bottom:**
   - **Verification** — the exact commands to run (`npm test` in each package) and the manual
     steps in the running app to confirm each top-level acceptance criterion.
   - **Risks / regressions to watch** — existing flows that could break (e.g. don't let bookmark/
     vote `.save()` falsely trip the "edited" flag; keep both test suites green).

5. **Report** the plan path and the number of steps. Do not implement yet — stop for human review.
