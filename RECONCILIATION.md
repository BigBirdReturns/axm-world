# Reconciliation: how this repo stays in sync with axm-arc

The canonical contract lives in **axm-arc's `RECONCILIATION.md`**. Arc is the
source and execution authority. World is a Rodoh player and renderer over one
exact vendored Arc source plane.

## What is vendored here

These paths are byte-identical copies of the Arc commit recorded in
`src/engine/VENDORED_FROM`:

- `src/engine/` — deterministic execution, state, composition, custody, and save law;
- `src/arcs/` — bundled reference Arc content;
- `src/godscar/` — Book I Pocket source grammar and compiler;
- `src/dark-tomb/` — Book II Dark Tomb source grammar and compiler;
- `src/common-ship/` — Book III Common Ship source grammar and compiler;
- `src/source-planes/` — the canonical registry joining formats, extension keys, starters, validators, compilers, and exact recovery;
- `tests/engine/`, `tests/fixtures/`, `tests/godscar/`, `tests/dark-tomb/`, `tests/common-ship/`, and `tests/source-planes/` — the shared conformance surface;
- `cartridges/` — published creator sources and compiled portable examples.

World's `src/world/`, `src/spoke/`, browser tests, receiver state, presentation,
and assets remain World-owned. World may inspect registered creator source and
render engine facts. It may not maintain a second validator, compiler, resolver,
state transition, or composition evaluator.

## The rule

**Never land a shared-surface change here alone.** For an engine, schema,
source-plane, registry, fixture, or reference-cartridge change:

1. Land and review it in axm-arc first, with tests.
2. Run `npm run engine:sync -- <arc ref>` in World.
3. Run `npm run check` and the browser/product-parity gates.
4. Commit the exact sync and updated `VENDORED_FROM` pin.

`npm run engine:check` and the `engine-drift` workflow diff every shared path
against the pinned Arc commit. Unknown namespaced Arc and run extensions remain
holder-owned data. A receiver that does not recognize them must preserve them.

World source-plane inspection consumes the vendored registry. It reports known
valid or invalid embedded source objects and identifies unknown extension keys;
it does not reinterpret their law.
