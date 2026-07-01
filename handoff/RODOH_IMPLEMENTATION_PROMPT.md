# Rodoh Visual Asset Payload — Completion Summary

This documents what changed on `claude/rodoh-assets-incomplete-noex17` to finish
integrating the Rodoh visual asset payload that a previous pass only partially
wired up.

## What was broken

1. `src/world/contract-board/contract-board.css` referenced 7 undefined CSS
   custom properties (`--rodoh-cream`, `--rodoh-charcoal`, `--rodoh-border`,
   `--rodoh-yellow`, `--rodoh-paper-edge`, `--rodoh-teal`, `--rodoh-ink`) that
   do not exist anywhere — `pixel-ui.css` defines a different token set
   (`--cream`, `--ink`, `--gold`, `--teal`, etc). Same bug in `pixel-ui.css`'s
   own `.renderer-fallback` rule (`--rodoh-cream`, `--rodoh-pixel-font`).
2. Eight components implied by the design system (role badges, attribute
   chips, gear slots, state badges, contract cards, roster cards, readiness
   rows, loot cards) existed only as inline styles duplicated across
   `regions.tsx` and `ContractBoard.tsx` — never as real components.
3. There was no live route to see the component set rendered on its own.
4. Encounter overlays used raw emoji (🐀 🌉 🛒 ⛏️ 🔥 🏰) instead of the
   First Charter theme's motif icon set.
5. `ContractBoard.tsx` had a bespoke `ContractLocationCard` that duplicated
   markup instead of using a shared component.

## What changed

- **Token namespace**: every `--rodoh-*` reference replaced with the canonical
  `pixel-ui.css` tokens. Verified by
  `tests/world/pixel-ui-integration.test.ts` ("CSS uses the canonical
  token namespace").
- **New live components** in `src/world/pixel-ui/`: `PixelRoleBadge`,
  `PixelAttribute`, `PixelGearSlot`, `PixelStateBadge`, `PixelReadinessRow`,
  `PixelLootCard`, `PixelRosterCard`, `PixelContractCard`. All exported from
  `src/world/pixel-ui/index.ts`.
- **Live dev route** at `/rodoh/ui-kit`
  (`src/world/dev/RodohUiKitRoute.tsx`, wired in `src/world/Player.tsx`,
  code-split via `lazy()` so it never loads in the normal cartridge-select
  bundle).
- **First Charter motif icons**
  (`src/world/themes/first-charter/motif-icons.tsx` +
  `first-charter.css`) replace the emoji glyph map in
  `EncounterDirector.tsx`.
- **Gameplay rewiring**:
  - `regions.tsx`'s `RosterCard` now renders `PixelRosterCard`, which
    internally uses `PixelRoleBadge`, `PixelAttribute`, and `PixelGearSlot`.
  - `regions.tsx`'s `ReadinessPanel` now renders `PixelReadinessRow` per
    check instead of inline divs.
  - `regions.tsx`'s `LootRegion` now renders `PixelLootCard`.
  - `ContractBoard.tsx`'s `ContractLocationCard` now renders
    `PixelContractCard` instead of bespoke markup.
- **Reference assets**: `docs/design/references/` (README, static no-font
  HTML reference sheet, standalone component inventory table).

## Verification

- `npm run typecheck` — passes clean.
- `npm test` — 237 tests pass, including 10 new integration tests in
  `tests/world/pixel-ui-integration.test.ts` that assert gameplay files
  actually import the same components shown at `/rodoh/ui-kit`.
- `npm run build` — succeeds; `RodohUiKitRoute` code-splits into its own
  chunk, confirming it does not bloat the cartridge-select entry bundle.
