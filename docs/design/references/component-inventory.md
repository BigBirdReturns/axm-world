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

**Revision 2 (extraction pass).** Every `PixelIconName` is now a 32x32
pixel-grid SVG (`src/world/pixel-ui/PixelIcon.tsx`, `GRIDS` map), generated
programmatically from `02_axm_world_runtime_ui_asset_pack.png` rather than
hand-drawn from visual memory (the first pass, at 8x8, was hand-traced and is
now superseded):

1. Locate each icon's bounding box via connected-component detection on
   non-background pixels (per section: contract state icons, role badges,
   attribute icons, starter item icons).
2. Crop tightly, pad to square, downsample to 32x32 with LANCZOS resampling.
3. Classify every cell by luminance/background-distance into one of three
   tones: `#` colored fill (rendered in CSS `currentColor`, so gameplay still
   controls the semantic color per state/role/attribute), `o` dark outline
   (the source art's pixel-art border, rendered in a fixed dark tone), `w`
   light/white detail (stars, crosses, highlights, page lines, rendered in a
   fixed light tone). `.` is background/transparent.

This is a **redrawn derivative**, not a harvested asset — the extraction
produces a small categorical grid, not an embedded copy of the source image —
but the shape, proportions, and multi-tone structure are traced directly from
the sheet, not invented. Column "match quality" flags the few icons where
disconnected fragments (thin flourishes, distant accent marks) were dropped
by the connected-component step rather than merged in.

| icon | harvested source | match quality |
|---|---|---|
| available | `02_...asset_pack.png` §1 "Contract State Icons" — document/page icon | close — page, fold corner, highlight dot, 3 text bars |
| reliable | `02_...asset_pack.png` §1 — shield with white star | close — full shield + 5-point star, extracted directly |
| risky | `02_...asset_pack.png` §1 — gold diamond with exclamation | close — diamond + exclamation mark |
| failing | `02_...asset_pack.png` §1 — red skull | close — skull, eye sockets, nose, teeth |
| locked | `02_...asset_pack.png` §1 / §6 — padlock | close — shackle + body + keyhole |
| recorded | `02_...asset_pack.png` §1 — stacked lines / ledger | close — charcoal ledger body + 3 bars |
| selected | `02_...asset_pack.png` §1 — filled tile + corner-bracket viewfinder frame | approximate — filled tile extracted cleanly; the 4 corner brackets are a disconnected fragment the extraction dropped |
| lootAvailable | `02_...asset_pack.png` §1 / §6 — treasure chest with sparkle accents | approximate — chest with clasp band extracted cleanly; the orbiting sparkle accents are disconnected fragments the extraction dropped |
| vanguard | `02_...asset_pack.png` §2 "Role Badges" — nested shield-in-shield | close — outer shield + inner white shield + inner teal shield |
| skirmisher | `02_...asset_pack.png` §2 — shield with crossed swords | close — shield + crossed blades |
| mender | `02_...asset_pack.png` §2 — shield with white cross | close — shield + cross, extracted directly |
| power | `02_...asset_pack.png` §3 "Attribute Icons" — clenched fist | close — fist with visible knuckles/fingers |
| mettle | `02_...asset_pack.png` §3 — gold shield with highlight stripe | close — shield + highlight |
| wits | `02_...asset_pack.png` §3 — angled blue book | close — book body, spine, page-edge stripes |
| spirit | `02_...asset_pack.png` §3 — teal flame with dark/white core | close — flame silhouette + core detail |
| rustyBlade | `02_...asset_pack.png` §4 "Starter Item Icons" — silver sword | close — full blade, crossguard, hilt |
| guardCharm | `02_...asset_pack.png` §4 — medallion on a ring loop | close — ring loop + medallion, extracted as one merged region |
| fieldSatchel | `02_...asset_pack.png` §4 — brown satchel with flap/buckle | close — satchel body, flap, buckle (fixed a bounding-box bug that had split it into two fragments) |
| emptySlot | `02_...asset_pack.png` §4 — dashed corner-bracket outline | close — both corner brackets merged into one icon (fixed a bounding-box bug that mapped this slot to a stray fragment of fieldSatchel) |

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

Every `PixelIcon` shape above is a **redrawn derivative** extracted directly
from `02_axm_world_runtime_ui_asset_pack.png` by the pipeline described above
— not a harvested asset (it's a generated grid, not the source file) and not
a newly invented placeholder (every shape traces a real icon on the sheet).
Two icons (`selected`, `lootAvailable`) are missing a minor accent that was a
disconnected fragment in the source image; everything else is a close match.
`MotifIcon` remains hand-authored SVG paths (not grid-extracted) — a
reasonable choice for organic shapes like the dandelion, but a candidate for
the same extraction treatment in a future pass if exact fidelity matters.
