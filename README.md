# AXM-WORLD — the reusable spatial runtime player

**Rodoh is its player-facing identity. Cartridge in → governed world out.**

AXM-WORLD is one compatible runtime player in the AXM family. It interprets
creator-owned cartridges through the shared deterministic engine without owning
their authored law or run record. Rodoh is the identity and interaction language
humans encounter; AXM-WORLD is the implementation name used in this repository.

Inside Rodoh, board, map, hall, globe, graph, and report are representations of
one cartridge and one run—not separate games. `axm-arc` is both the authoring hub
and another, text-oriented runtime player.

The renderer never reimplements the rules. It calls the engine's pure functions
(`foundOrganization`, `runCycle`, the seeded PRNG) and draws whatever comes back.
That boundary is the whole point: the logic stays portable, the presentation
stays replaceable.

## What's here

- `src/engine/**` — the deterministic rules engine, vendored from `axm-arc`.
  Pure, headless, no UI. The source of truth for *what happens*.
- `src/game/**` — the player UI (roster, assignment, drama, base, reports
  across cycles). Arc-agnostic: it renders whatever arc it's handed.
- `src/engine/founding.ts` — **the canonical cartridge founding transition.**
  `foundOrganization(arc, input)` applies the Arc-owned founding law (or the
  engine's frozen legacy fallback) identically in every client. Same Arc bytes
  + same founding input → byte-identical opening state.
- `src/spoke/bootstrap.ts` — deprecated source-compatible facade only; it
  delegates to `foundOrganization` and owns no roster/resource/opening policy.

## Why canonical founding matters

The hub app could already load arbitrary arcs, but any arc that wasn't the
bundled tutorial dropped the player into an *empty* charter (`agents: {}`). It
loaded; it wasn't playable. The shared founding transition turns "loads any
Arc" into "plays any Arc" without letting Arc and World invent different
starting state for the same artifact.

## Develop

```bash
npm install
npm run dev        # play in the browser
npm run typecheck
npm test           # engine + spoke suites
npm run build      # emits docs/game
```

## Status

The cartridge bay, generic boot path, Board/Map/Encounter/Result/Ledger chain,
digest-bound saves, custody export, and proximity-gated inhabited slice are
implemented. The engine and shared tests remain vendored from `axm-arc` and
pinned to an exact commit — see [RECONCILIATION.md](RECONCILIATION.md).

The game is not finished merely because the architecture is proven. Current
product work is to close The First Charter as an unaided, complete, memorable
game and to turn one-way custody export into an import/resume round trip. See
[VISION.md](VISION.md) and [docs/WORLDS_ROADMAP.md](docs/WORLDS_ROADMAP.md).
