# AXM-WORLD — the reusable spatial runtime player

**Rodoh is its player-facing identity. Cartridge in → governed world out.**

AXM-WORLD is one compatible runtime player in the AXM family. It interprets
creator-owned cartridges through the shared deterministic engine without owning
their authored law or run record. Rodoh is the identity and interaction language
humans encounter; AXM-WORLD is the implementation name used in this repository.

Inside Rodoh, board, map, hall, globe, aperture, underworld, common ship, graph, and report are representations of one cartridge and one run, not separate games. `axm-arc` is both the authoring hub
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
- `src/world/aperture/**` — the high-information Book I representation: campaign, contracts, bounded people, exact receipts, and validated Godscar Pocket source.
- `src/world/underworld/**` — the Book II civic-underworld representation: hub, Long Alarm, signature, visibility, seven layers, expedition ledgers, and exact inherited Tomb state.
- `src/world/common-ship/**` — the Book III vessel-management representation: embodiment profiles, decision horizons, Arc-owned Common Watch verdicts, preparation cycles, eight ship-state tracks, handoff and precedent, and connected Lamp District custody.
- `src/godscar/**` + `cartridges/kind-gods-of-ilyon.*` — the vendored Pocket grammar and its first creator-owned source/executable cartridge pair.
- `src/dark-tomb/**` + `cartridges/lamp-district.*` — the exact Gate 3 Dark Tomb source, compiled cartridge, and canonical Book II reference consumed by World.
- `src/common-ship/**` + `cartridges/relief-circuit.*` — the accepted Book III source, compiled cartridge, connected-operation fixture, and canonical Common Ship reference.
- `src/world/themes/first-charter/**`, `src/world/themes/karazhan/**`, and
  `src/world/themes/ilyon/**`, `src/world/themes/lamp-district/**`, and the direct Relief Circuit vessel asset pack — cartridge-owned role portraits/bodies, encounter motifs, emblems, material treatments, and procedural palettes for every bundled cartridge. See the governed asset bibles under `docs/design/`.

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

The cartridge bay, digest-addressed immutable revisions, exact
`axm-cartridge-run/v3` import/export, transactional restore, guided First Charter
entry, reusable Board/Map/Hall/Globe/Aperture shell, complete six-contract
campaign, offline boot, visible save recovery, and multi-cartridge receiver are
implemented. The bundled proofs are **The First Charter**, **The Waking Tower**, **The Kind Gods of Ilyon**, **The Lamp District**, and **The Relief Circuit**. The engine and creator grammar remain vendored from `axm-arc`
and pinned to an exact commit — see [RECONCILIATION.md](RECONCILIATION.md).

The bundled local-first product scope is release-qualified: all five cartridges now share full-campaign and exact-custody coverage, cartridge-owned role art, every shipped representation, responsive parity, local sensory controls, and focused regression gates. The implemented Godscar scope proves exact Arc provenance and deterministic full campaigns across Books I through III. Ilyon owns Aperture. The Lamp District owns Underworld, a seven-layer civic map, exact Tomb-state projection, complete desktop/mobile export-import-resume acceptance, and its production identity pack. The Relief Circuit owns Common Ship, six embodied founding profiles, Arc-authoritative roster feasibility, preparation cycles, eight exact ship-state tracks, the connected Lamp District operation, and complete desktop/mobile export-import-resume custody.
The campaign has a model-based narrative acceptance record in
[axm-arc](https://github.com/BigBirdReturns/axm-arc/blob/main/docs/ILYON_ACCEPTANCE.md).
Human sessions remain valuable telemetry and regression discovery; they are not
a prerequisite for calling the cartridge or receiver complete. Legacy browser receipts are maintained against the current guided-entry contract rather than treated as a separate release veto. See [VISION.md](VISION.md) and [docs/WORLDS_ROADMAP.md](docs/WORLDS_ROADMAP.md).

The parity claim is bounded to the dependency-free local browser product. Multiplayer, cloud identity, marketplace services, orchestral/cinematic media, and high-resolution painted illustration remain separate expansion products, not uneven missing lanes inside the shipped runtime.
