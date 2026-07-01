# Rodoh Pixel-UI Component Inventory

Standalone inventory of every component in the Rodoh visual system. "Used in
gameplay" means the component (or its class names) appears in an actual
gameplay surface — not only in the `/rodoh/ui-kit` reference route.

Provenance uses three levels, per the harvested payload's own rule ("Do not
slice the reference sheets directly into production UI. Convert them into
tokens, components, and a small controlled icon set" —
`docs/design/harvest/rodoh-buffalo-harvest.zip` README):

- **harvested asset** — the actual source file from the payload, used as-is.
- **redrawn derivative** — built by looking at a named harvested sheet and
  reproducing its shapes/rules as runtime code (CSS tokens, SVG icons). This
  is the expected outcome for icons per the harvest's own rule above.
- **newly invented placeholder** — no corresponding shape exists on any
  harvested sheet; the shape was chosen without a source reference.

## Components

| Component | File | CSS class prefix | Used in gameplay | Provenance |
|---|---|---|---|---|
| PixelPanel | `src/world/pixel-ui/PixelPanel.tsx` | `.pixel-panel` | Yes — ContractRegion, ReportRegion, PixelRosterCard, PixelLootCard, PixelContractCard | Redrawn derivative — panel frame / 9-slice rules from `01_rodoh_platform_identity_system_guide.png` §5 "Panel Frames" |
| PixelButton | `src/world/pixel-ui/PixelButton.tsx` | `.pixel-button` | Yes — ContractRegion, RosterRegion downtime actions, LootRegion | Redrawn derivative — button states from `01_...guide.png` §5 "Button States" and `02_axm_world_runtime_ui_asset_pack.png` §5 |
| PixelBadge | `src/world/pixel-ui/PixelBadge.tsx` | `.pixel-badge` | Yes — ContractRegion, ReportRegion, PixelStateBadge | Redrawn derivative — chip/badge shapes from `01_...guide.png` §5 "Chips" and §6 "Badges & Chips Library" |
| PixelIcon | `src/world/pixel-ui/PixelIcon.tsx` | `.pixel-icon` | Yes — everywhere attribute/role/state icons appear | Redrawn derivative (per-icon breakdown below) |
| PixelMeter | `src/world/pixel-ui/PixelMeter.tsx` | `.pixel-meter` | Yes — PixelRosterCard stress/morale meters | Redrawn derivative — `02_...asset_pack.png` §7 "Meter Pieces" |
| PixelFrame | `src/world/pixel-ui/PixelFrame.tsx` | `.pixel-frame` | UI kit only (decorative frame, not yet placed in a gameplay surface) | Newly invented placeholder — no gameplay use is justified yet, so no sheet section was targeted |
| PixelRoleBadge | `src/world/pixel-ui/PixelRoleBadge.tsx` | `.pixel-role-badge` | Yes — PixelRosterCard | Redrawn derivative — wraps PixelIcon role icons |
| PixelAttribute | `src/world/pixel-ui/PixelAttribute.tsx` | `.pixel-attribute` | Yes — PixelRosterCard | Redrawn derivative — wraps PixelIcon attribute icons |
| PixelGearSlot | `src/world/pixel-ui/PixelGearSlot.tsx` | `.pixel-gear-slot` | Yes — PixelRosterCard | Redrawn derivative — wraps PixelIcon item icons; slot shape from `02_...asset_pack.png` §4 "Starter Item Icons" (empty slot) |
| PixelStateBadge | `src/world/pixel-ui/PixelStateBadge.tsx` | `.pixel-badge` (wraps PixelBadge) | Yes — PixelContractCard | Redrawn derivative — wraps PixelBadge + PixelIcon state icons |
| PixelReadinessRow | `src/world/pixel-ui/PixelReadinessRow.tsx` | `.check-row`, `.pixel-readiness-row` | Yes — ContractRegion's ReadinessPanel | Redrawn derivative — `01_...guide.png` §5 "Meter & Toggles / Readiness Bar" |
| PixelLootCard | `src/world/pixel-ui/PixelLootCard.tsx` | `.pixel-loot-card` | Yes — LootRegion | Redrawn derivative — `02_...asset_pack.png` §8 "Loot Card Frame" |
| PixelRosterCard | `src/world/pixel-ui/PixelRosterCard.tsx` | `.pixel-roster-card` | Yes — RosterRegion | Redrawn derivative — `02_...asset_pack.png` §8 "Roster Card Frame" |
| PixelContractCard | `src/world/pixel-ui/PixelContractCard.tsx` | `.pixel-contract-card` | Yes — ContractBoard's ContractLocationCard | Redrawn derivative — `02_...asset_pack.png` §8 "Selected Contract Card Frame" |
| MotifIcon (First Charter) | `src/world/themes/first-charter/motif-icons.tsx` | `.fc-motif-icon` | Yes — EncounterDirector overlay (replaces emoji glyphs) | Redrawn derivative — `03_first_charter_theme_asset_pack_overview.png` §1 "Motif Icons" (per-motif breakdown below) |

## PixelIcon per-icon provenance

Every `PixelIconName` is an 8x8 pixel-grid SVG (`src/world/pixel-ui/PixelIcon.tsx`,
`GRIDS` map) — not a font glyph, not a slice of the PNG. Column "match quality"
is an honest self-assessment: how closely the redrawn 8x8 shape tracks the
harvested sheet's icon versus being a loose approximation forced by the low
pixel budget.

| icon | harvested source | match quality |
|---|---|---|
| available | `02_...asset_pack.png` §1 "Contract State Icons" — document/page icon | close — page rectangle + text bars |
| reliable | `02_...asset_pack.png` §1 — shield with white star | approximate — shield + filled center mark (no true star at 8x8) |
| risky | `02_...asset_pack.png` §1 — gold diamond with exclamation | close — diamond outline + exclamation stem |
| failing | `02_...asset_pack.png` §1 — red skull | close — skull silhouette (head, eye sockets, teeth) |
| locked | `02_...asset_pack.png` §1 / §6 — padlock | close — padlock body + shackle |
| recorded | `02_...asset_pack.png` §1 — stacked lines / ledger | close — stacked ledger bars |
| selected | `02_...asset_pack.png` §1 — corner-bracket viewfinder frame | close — four corner brackets |
| lootAvailable | `02_...asset_pack.png` §1 / §6 — treasure chest | approximate — chest silhouette with clasp band |
| vanguard | `02_...asset_pack.png` §2 "Role Badges" — teal shield | close — shield outline |
| skirmisher | `02_...asset_pack.png` §2 — shield with crossed axes | approximate — shield + crossed interior lines |
| mender | `02_...asset_pack.png` §2 — shield with white cross | close — shield + cross |
| power | `02_...asset_pack.png` §3 "Attribute Icons" — red fist | approximate — rounded fist silhouette |
| mettle | `02_...asset_pack.png` §3 — gold shield | close — plain shield outline |
| wits | `02_...asset_pack.png` §3 — blue book | approximate — rectangle + spine line (reads more like a frame than a book at 8x8) |
| spirit | `02_...asset_pack.png` §3 — teal flame | close — flame/droplet silhouette |
| rustyBlade | `02_...asset_pack.png` §4 "Starter Item Icons" — gray sword | approximate — diagonal blade + crossguard |
| guardCharm | `02_...asset_pack.png` §4 — brown/gold pendant | approximate — concentric-circle amulet (no chain loop at 8x8) |
| fieldSatchel | `02_...asset_pack.png` §4 — brown satchel | close — bag body + flap/strap line |
| emptySlot | `02_...asset_pack.png` §4 — dashed empty slot outline | close — dashed square |

## MotifIcon per-motif provenance

`src/world/themes/first-charter/motif-icons.tsx` — 16x16 viewBox SVG paths,
also redrawn derivatives, not slices.

| motif | harvested source | match quality |
|---|---|---|
| dandelion | `03_...overview.png` §1 "Motif Icons" — dandelion seed head on a stem | approximate — circular seed cluster on a stem |
| archiveBox | `03_...overview.png` §1 — wooden reinforced crate | approximate — box outline + reinforcement line |
| coffeeMug | `03_...overview.png` §1 — mug with handle | close — mug body + handle |
| crossedCalendar | `03_...overview.png` §1 — torn calendar page, spiral top, crossed-off | close — page + binding marks + diagonal cross |
| receiptTab | `03_...overview.png` §1 — deckle-edge paper tab with lines | close — scalloped-bottom tab + text lines |
| notebook | `03_...overview.png` §1 — spiral-bound notebook | close — cover + spine + lines |
| starSpark | `03_...overview.png` §1 — 4-point sparkle | close — 4-point star |

## Acceptance rule

A component only counts as "integrated" when it appears in this table with
"Yes" in the gameplay column **and** the corresponding gameplay file actually
imports it (verified by `tests/world/pixel-ui-integration.test.ts`). Appearing
only in `/rodoh/ui-kit` is not integration — it is a demo. PixelFrame remains a
newly invented placeholder because no gameplay surface currently has a
justified use for that decorative wrapper, so no harvested section was
targeted for it.

Every icon above is a **redrawn derivative**, not a harvested asset and not a
newly invented placeholder — the PNGs were used as direct visual reference
while drawing each 8x8/16x16 shape. None are pixel-perfect reproductions;
"match quality" states how close the low-resolution redraw tracks the source.
