# axm-world — the AXM play spoke

**Arc in → playable web app out.**

`axm-arc` is the *hub*: a deterministic rules engine (the "brain") plus an
authored tutorial game. `axm-world` is a **spoke** — a renderer/player that
takes any arc and makes it playable in a browser, without owning the arc. Same
brain, swappable player; drop in a cartridge, play it.

The renderer never reimplements the rules. It calls the engine's pure functions
(`runCycle`, `generateAgent`, the seeded PRNG) and draws whatever comes back.
That boundary is the whole point: the logic stays portable, the presentation
stays replaceable.

## What's here

- `src/engine/**` — the deterministic rules engine, vendored from `axm-arc`.
  Pure, headless, no UI. The source of truth for *what happens*.
- `src/game/**` — the player UI (roster, assignment, drama, base, reports
  across cycles). Arc-agnostic: it renders whatever arc it's handed.
- `src/spoke/bootstrap.ts` — **the cartridge slot.** `bootstrapOrg(arc)` takes
  *any* arc and procedurally generates a real, populated, playable starting
  organization by driving the engine's own `generateAgent` against the arc's
  tiers, roles, attributes, and name pool. Deterministic: same arc + same seed
  → the same opening, every time.

## Why bootstrap matters

The hub app could already load arbitrary arcs, but any arc that wasn't the
bundled tutorial dropped the player into an *empty* charter (`agents: {}`). It
loaded; it wasn't playable. `bootstrapOrg` is what turns "loads any arc" into
"plays any arc" — the missing piece that makes the spoke a real player rather
than a single game.

## Develop

```bash
npm install
npm run dev        # play in the browser
npm run typecheck
npm test           # engine + spoke suites
npm run build      # emits docs/game
```

## Status

Early. The engine, tutorial arc, and engine tests are vendored from `axm-arc`
and pinned to an exact commit — see [RECONCILIATION.md](RECONCILIATION.md) for
the contract that keeps hub and spoke from drifting (changes to the shared
surface land in `axm-arc` first; `npm run engine:sync` re-vendors, and CI fails
on silent divergence). The boot screen imports any `.arc.json` cartridge —
validated by the same vendored seam, with a per-cartridge save ledger keyed
by content digest (`cart1_…`). The full authorship-to-play pipeline is
family doctrine:
[axm-genesis `docs/CARTRIDGE_LIFECYCLE.md`](https://github.com/BigBirdReturns/axm-genesis/blob/main/docs/CARTRIDGE_LIFECYCLE.md).

## Localization

Chrome is translated (en / zh-Hant) via `src/world/i18n/` — the family's
reference implementation. The one rule: **chrome is the app's to translate;
arc data flows verbatim** (a cartridge's own vocabulary always wins). A
coverage-guard test (`tests/world/locale.test.ts`) keeps the catalog honest:
every English id is translated or explicitly listed EN-only. Normative
doctrine + adaptation guidance for other stacks lives in
[axm-genesis `docs/LOCALIZATION.md`](https://github.com/BigBirdReturns/axm-genesis/blob/main/docs/LOCALIZATION.md).
