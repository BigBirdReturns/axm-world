# Reconciliation: how this repo stays in sync with axm-arc

The canonical contract lives in **axm-arc's `RECONCILIATION.md`** — axm-arc is
the hub and owns the shared surface. This file is the world-side operational
summary.

## What is vendored here

These paths are byte-identical copies of axm-arc, pinned to the commit
recorded in `src/engine/VENDORED_FROM`:

- `src/engine/` — the deterministic rules engine
- `src/arcs/` — the bundled tutorial arc content
- `tests/engine/` — engine subsystem + resolver tests
- `tests/fixtures/` — shared test fixtures

Everything else in this repo — `src/world/`, `src/spoke/`, `src/play-pipeline/`,
the world/spoke/game test suites — is world's own and free to evolve.

## The rule

**Never land a shared-surface change here alone.** If you need an engine,
schema, or tutorial-arc change:

1. Land it in axm-arc first (or upstream it in the same sitting if you
   prototyped it here), with tests.
2. Back here, run `npm run engine:sync <arc ref>` — it re-vendors all four
   paths and moves the pin in `VENDORED_FROM`.
3. `npm run check`, commit the sync as its own commit.

`npm run engine:check` (and the `engine-drift` CI job, which runs on any push
or PR touching the shared paths) diffs the working copies against the pinned
axm-arc commit and fails on any mismatch — that is the guardrail that makes
"whatever we do hits both" enforceable rather than aspirational.
