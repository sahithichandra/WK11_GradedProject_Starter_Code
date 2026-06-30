# DevAnswers `.claude/` Workflow Toolkit

A reusable toolkit for driving feature work through the Week 11 agentic pipeline:

> **brainstorm → spec → plan → implement → review → test & verify**

## Contents

| Path | Purpose |
|------|---------|
| `../CLAUDE.md` | **Project memory.** Both architectures (backend layering + envelope + auth; frontend config→service→slice→component), conventions, and a verified "what already exists vs. what's missing" map so the agent never reinvents existing capability. |
| `commands/spec.md` | `/spec <feature>` — explore the codebase, then write a precise, testable spec to `specs/<feature>-spec.md` (acceptance criteria, API contract, data model, file list, test plan). The highest-leverage step. |
| `commands/plan-feature.md` | `/plan-feature <spec path>` — turn a reviewed spec into an ordered, bottom-up implementation plan in `specs/<feature>-plan.md`. |
| `commands/implement.md` | `/implement <plan path>` — build to the plan, tests-first, on existing patterns, keeping both suites green. |
| `commands/review-feature.md` | `/review-feature [spec/plan]` — review the working diff for correctness, authorization, convention fidelity, and spec coverage. (Complements the built-in `/code-review`.) |
| `settings.json` | Project permission allowlist (tests, dev server, git, `gh`) to reduce prompts; denies reading `.env` and `rm -rf`. |

## How to use

```
/spec Bookmark questions for later        # → review specs/bookmarks-spec.md, tighten
/plan-feature specs/bookmarks-spec.md      # → review specs/bookmarks-plan.md
/implement specs/bookmarks-plan.md         # tests-first build
/review-feature specs/bookmarks-spec.md    # review the diff
```

Artifacts (`specs/*-spec.md`, `specs/*-plan.md`) are deliverables — review and tighten each before
moving to the next stage. The spec is where judgment pays off most.
