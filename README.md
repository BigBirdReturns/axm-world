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

Early. The engine and player are vendored from `axm-arc` and the generic
bootstrap is new here. Next steps: a cartridge loader (open an arc from a
file/URL instead of the bundled default), and turning the vendored engine into a
shared dependency so the hub and spoke can't drift.
