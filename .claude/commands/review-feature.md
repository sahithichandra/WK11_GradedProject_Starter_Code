---
description: Review the working diff for a feature against DevAnswers conventions and its spec
argument-hint: [optional: path to the spec/plan to check against]
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status:*), Bash(npm test:*)
---

Review the current working changes before they are committed/merged. If a spec or plan path is given
in **$ARGUMENTS**, check the diff against it; otherwise infer the intent from the diff.

## Steps

1. Run `git status` and `git diff` (include staged) to see all changes. Read full files where the
   diff lacks context.

2. **Review for, in priority order:**
   - **Correctness & security** — broken logic, unhandled errors, and especially **authorization**:
     does the server reject edits/actions by non-authors (the `author/admin` check in the service,
     not just the UI)? Is auth required where the spec says so? Is per-user data isolated?
   - **Convention fidelity** (`CLAUDE.md`) — backend layering and `{success,message,data}` envelope;
     `createAppError` thrown from services (no `res` in services, no try/catch in controllers);
     frontend config→service→slice→component, per-request token, envelope-unwrapping, react-icons.
   - **The "edited" trap** — confirm vote/view/bookmark `.save()` paths do **not** flip the edited
     indicator; only the update service should.
   - **Regressions** — existing flows or tests that the change could break.
   - **Spec coverage** — each acceptance criterion: met / not met / untested.
   - **Reuse & simplicity** — duplicated logic that should reuse existing helpers; dead code.

3. **Report findings** grouped by severity (Must-fix / Should-fix / Nit), each with `file:line`, the
   problem, and a concrete suggested fix. End with a one-line verdict (ship / fix-then-ship) and note
   whether `npm test` passes in both packages. Do not modify code in this command — report only.
