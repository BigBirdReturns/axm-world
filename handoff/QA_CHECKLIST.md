# Rodoh Asset Integration — QA Checklist

Use this to verify the Rodoh visual asset payload is genuinely wired into
runtime gameplay, not just documented.

- [ ] `npm run typecheck` passes with no errors.
- [ ] `npm test` passes, including `tests/world/pixel-ui-integration.test.ts`.
- [ ] `npm run build` succeeds and `RodohUiKitRoute` appears as its own chunk
      in the build output (confirms lazy code-splitting, not bundled into the
      cartridge-select entry).
- [ ] Visiting `/rodoh/ui-kit` in a running dev server renders every
      component: role badges, attributes, gear slots, state badges, readiness
      rows, loot cards, a roster card, a contract card, and all seven First
      Charter motif icons.
- [ ] `grep -R "\-\-rodoh-" src/` returns nothing — no undefined CSS custom
      properties remain.
- [ ] Roster cards in actual gameplay (`RosterRegion`) show role badges,
      attribute chips, and gear slots using the same class names
      (`.pixel-role-badge`, `.pixel-attribute`, `.pixel-gear-slot`) as the
      `/rodoh/ui-kit` reference.
- [ ] The Contract Board (`ContractBoardScene`) renders cards via
      `PixelContractCard`, and locked cards show unlock requirements via
      `data-testid="unlock-requirements"`.
- [ ] Readiness checks in `ContractRegion` render via `PixelReadinessRow`,
      not ad hoc divs.
- [ ] Loot choices in `LootRegion` render via `PixelLootCard`.
- [ ] Encounter overlays (`EncounterDirector`) show an SVG `MotifIcon`, never
      raw emoji, for the location icon.
- [ ] Switching representation/costume in the Shell does not reset
      `useArcWorld`/`useArcInteraction` state (no `key={costumeId}` on Shell).

## Acceptance rule

Do not sign off as "complete" unless every box above is checked from the
running app or test output — not from reading source alone.
