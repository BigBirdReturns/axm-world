# Rodoh Pixel-UI Component Inventory

Standalone inventory of every component in the Rodoh visual system. "Used in
gameplay" means the component (or its class names) appears in an actual
gameplay surface — not only in the `/rodoh/ui-kit` reference route.

| Component | File | CSS class prefix | Used in gameplay |
|---|---|---|---|
| PixelPanel | `src/world/pixel-ui/PixelPanel.tsx` | `.pixel-panel` | Yes — ContractRegion, ReportRegion, PixelRosterCard, PixelLootCard, PixelContractCard |
| PixelButton | `src/world/pixel-ui/PixelButton.tsx` | `.pixel-button` | Yes — ContractRegion, RosterRegion downtime actions, LootRegion |
| PixelBadge | `src/world/pixel-ui/PixelBadge.tsx` | `.pixel-badge` | Yes — ContractRegion, ReportRegion, PixelStateBadge |
| PixelIcon | `src/world/pixel-ui/PixelIcon.tsx` | `.pixel-icon` | Yes — everywhere attribute/role/state glyphs appear |
| PixelMeter | `src/world/pixel-ui/PixelMeter.tsx` | `.pixel-meter` | Yes — PixelRosterCard stress/morale meters |
| PixelFrame | `src/world/pixel-ui/PixelFrame.tsx` | `.pixel-frame` | UI kit only (decorative frame, not yet placed in a gameplay surface) |
| PixelRoleBadge | `src/world/pixel-ui/PixelRoleBadge.tsx` | `.pixel-role-badge` | Yes — PixelRosterCard |
| PixelAttribute | `src/world/pixel-ui/PixelAttribute.tsx` | `.pixel-attribute` | Yes — PixelRosterCard |
| PixelGearSlot | `src/world/pixel-ui/PixelGearSlot.tsx` | `.pixel-gear-slot` | Yes — PixelRosterCard |
| PixelStateBadge | `src/world/pixel-ui/PixelStateBadge.tsx` | `.pixel-badge` (wraps PixelBadge) | Yes — PixelContractCard |
| PixelReadinessRow | `src/world/pixel-ui/PixelReadinessRow.tsx` | `.check-row`, `.pixel-readiness-row` | Yes — ContractRegion's ReadinessPanel |
| PixelLootCard | `src/world/pixel-ui/PixelLootCard.tsx` | `.pixel-loot-card` | Yes — LootRegion |
| PixelRosterCard | `src/world/pixel-ui/PixelRosterCard.tsx` | `.pixel-roster-card` | Yes — RosterRegion |
| PixelContractCard | `src/world/pixel-ui/PixelContractCard.tsx` | `.pixel-contract-card` | Yes — ContractBoard's ContractLocationCard |
| MotifIcon (First Charter) | `src/world/themes/first-charter/motif-icons.tsx` | `.fc-motif-icon` | Yes — EncounterDirector overlay (replaces emoji glyphs) |

## Acceptance rule

A component only counts as "integrated" when it appears in this table with
"Yes" in the gameplay column **and** the corresponding gameplay file actually
imports it (verified by `tests/world/pixel-ui-integration.test.ts`). Appearing
only in `/rodoh/ui-kit` is not integration — it is a demo.
