---
description: Generate a precise, testable spec for a feature, grounded in the existing codebase
argument-hint: <feature name or short description>
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Write, Edit
---

You are writing a **specification** for the feature: **$ARGUMENTS**

A spec is the highest-leverage artifact in this workflow. Be precise and testable — a vague spec
produces vague code. Do **not** write implementation code in this command; produce a spec document only.

## Steps

1. **Explore first (read-only).** Map the feature against the existing architecture described in
   `CLAUDE.md` and the actual code. Identify:
   - What already exists that you can reuse or extend (check routes, controllers, services, models,
     `config.js`, services, slices). **Do not re-spec anything already implemented** — call it out as
     "already exists" instead.
   - The closest existing pattern to copy (e.g. the vote toggle for a bookmark toggle; the answer
     form for an inline edit form; `updateQuestionService` for authorization).
   - Every file that must be created or modified, in both packages.

2. **Write the spec** to `specs/<kebab-feature-name>-spec.md` with these sections:
   - **Summary** — one paragraph: what the user can do when this is done.
   - **User-facing behaviour & acceptance criteria** — a numbered checklist of observable,
     testable statements (each one a thing a test or a manual check can confirm). Cover the happy
     path, auth gating, per-user isolation, empty/edge states, and "must NOT" cases (e.g. affordance
     hidden for non-authors; server rejects unauthorized requests).
   - **Out of scope** — explicitly list what this feature does not include.
   - **API contract** — for each new/changed endpoint: method + path, auth required?, request body,
     success response (`{success,message,data}` shape with the exact `data`), and error responses
     (status + message). Mark endpoints that already exist.
   - **Data model changes** — exact Mongoose schema fields to add/change, with types and defaults,
     and any migration/back-compat note. Flag the `updatedAt`-is-not-"edited" trap where relevant.
   - **Frontend changes** — endpoints in `config.js`, service functions, slice state + thunks +
     reducers, and the component/page changes (which file, what UI, what conditions show it).
   - **File list** — a table of every file to create/modify (backend + frontend + tests) with a
     one-line note each. This becomes the backbone of the implementation plan.
   - **Test plan** — the backend unit/integration tests and frontend component/slice tests to add,
     each tied to an acceptance criterion.
   - **Open questions / decisions** — anything ambiguous, with your recommended default.

3. **Tighten it.** Re-read your own spec adversarially: is every criterion testable? Did you respect
   the layering, the response envelope, the auth/ownership pattern, and per-user isolation? Did you
   avoid duplicating existing capability? Revise before finishing.

4. **Report** the path to the spec and a 3–5 bullet summary of the key decisions and any open
   questions for the human to confirm. Then stop — do not plan or implement.
