# Rodoh Pixel-UI Component Inventory

Standalone inventory of every component in the Rodoh visual system. "Used in
gameplay" means the component (or its class names) appears in an actual
gameplay surface — not only in the `/rodoh/ui-kit` reference route.

## Asset standard

This is the ledger for the repo's one uniform visual-asset standard. Every
pixel-grid or hand-SVG asset in `src/world/` must follow these rules; guard
tests in `tests/world/asset-standard.test.ts` enforce them mechanically.

- **Provenance vocabulary** (four explicit levels, see below): "harvested
  asset" / "redrawn derivative" / "original governed asset" / "newly invented
  placeholder". This file is the ledger of record for which level applies to
  which component.
- **Grid systems in use**:
  - `PixelIcon` — 32x32 pixel grids, alphabet `. # o w`, all defined in
    `src/world/pixel-ui/PixelIcon.tsx` behind `PixelIconName`.
  - `MotifIcon` — 16x16 `viewBox` hand-authored SVG per theme, under
    `src/world/themes/<theme>/` (e.g. `src/world/themes/first-charter/motif-icons.tsx`).
  - Brand mark (`RodohRuntimeMark`) — governed 16x18 pixel grid, its own small
    alphabet (see the file's own header), not part of the `PixelIcon` set.
- **Palette rule**: pixel-grid tokens map to color through a single
  `colorFor`/palette lookup per component; every token used in a grid must be
  handled by that lookup, and every case in that lookup must appear in at
  least one grid (no dead tokens).
- **Location rule**: shared components live in `src/world/pixel-ui/`;
  cartridge-specific art lives in `src/world/themes/<theme>/`; brand identity
  (platform-level, not gameplay/cartridge) lives in `src/world/brand/`. No
  pixel-grid literal should be defined anywhere else.
- **Provenance header format**: every file that defines a pixel grid or a
  hand-SVG icon set opens with a header comment of the form:

  ```
  // Source: <harvested sheet filename + section, or "none — newly invented placeholder">
  // Grid: <WxH>
  // Encoding: <token>=<meaning> (one line per token)
  ```

Provenance uses three levels, per the harvested payload's own rule ("Do not
slice the reference sheets directly into production UI. Convert them into
tokens, components, and a small controlled icon set" —
`docs/design/harvest/rodoh-buffalo-harvest.zip` README):

- **harvested asset** — the actual source file from the payload, used as-is.
- **redrawn derivative** — built by looking at a named harvested sheet and
  reproducing its shapes/rules as runtime code (CSS tokens, SVG icons). This
  is the expected outcome for icons per the harvest's own rule above.
- **original governed asset** — intentional production art authored for a
  cartridge and bound to a committed asset bible/reference sheet.
- **newly invented placeholder** — no corresponding shape exists on any
  governed source; temporary only and ineligible for a completion claim.

## Components

| Component | File | CSS class prefix | Used in gameplay | Provenance |
|---|---|---|---|---|
| PixelPanel | `src/world/pixel-ui/PixelPanel.tsx` | `.pixel-panel` | Yes — ContractRegion, ReportRegion, PixelRosterCard, PixelLootCard, PixelContractCard | Redrawn derivative — panel frame / 9-slice rules from `rodoh_platform_identity_system_guide.png` §5 "Panel Frames" |
| PixelButton | `src/world/pixel-ui/PixelButton.tsx` | `.pixel-button` | Yes — ContractRegion, RosterRegion downtime actions, LootRegion | Redrawn derivative — button states from `...guide.png` §5 "Button States" and `axm_world_runtime_ui_asset_pack.png` §5 |
| PixelBadge | `src/world/pixel-ui/PixelBadge.tsx` | `.pixel-badge` | Yes — ContractRegion, ReportRegion, PixelStateBadge | Redrawn derivative — chip/badge shapes from `...guide.png` §5 "Chips" and §6 "Badges & Chips Library" |
| PixelIcon | `src/world/pixel-ui/PixelIcon.tsx` | `.pixel-icon` | Yes — everywhere attribute/role/state icons appear | Redrawn derivative (per-icon breakdown below) |
| PixelMeter | `src/world/pixel-ui/PixelMeter.tsx` | `.pixel-meter` | Yes — PixelRosterCard stress/morale meters | Redrawn derivative — `...asset_pack.png` §7 "Meter Pieces" |
| PixelRoleBadge | `src/world/pixel-ui/PixelRoleBadge.tsx` | `.pixel-role-badge` | Yes — PixelRosterCard | Redrawn derivative — wraps PixelIcon role icons |
| PixelAttribute | `src/world/pixel-ui/PixelAttribute.tsx` | `.pixel-attribute` | Yes — PixelRosterCard | Redrawn derivative — wraps PixelIcon attribute icons |
| PixelGearSlot | `src/world/pixel-ui/PixelGearSlot.tsx` | `.pixel-gear-slot` | Yes — PixelRosterCard | Redrawn derivative — wraps PixelIcon item icons; slot shape from `...asset_pack.png` §4 "Starter Item Icons" (empty slot) |
| PixelStateBadge | `src/world/pixel-ui/PixelStateBadge.tsx` | `.pixel-badge` (wraps PixelBadge) | Yes — PixelContractCard | Redrawn derivative — wraps PixelBadge + PixelIcon state icons |
| PixelReadinessRow | `src/world/pixel-ui/PixelReadinessRow.tsx` | `.check-row`, `.pixel-readiness-row` | Yes — ContractRegion's ReadinessPanel | Redrawn derivative — `...guide.png` §5 "Meter & Toggles / Readiness Bar" |
| PixelLootCard | `src/world/pixel-ui/PixelLootCard.tsx` | `.pixel-loot-card` | Yes — LootRegion | Redrawn derivative — `...asset_pack.png` §8 "Loot Card Frame" |
| PixelRosterCard | `src/world/pixel-ui/PixelRosterCard.tsx` | `.pixel-roster-card` | Yes — RosterRegion | Redrawn derivative — `...asset_pack.png` §8 "Roster Card Frame" |
| PixelContractCard | `src/world/pixel-ui/PixelContractCard.tsx` | `.pixel-contract-card` | Yes — ContractBoard's ContractLocationCard | Redrawn derivative — `...asset_pack.png` §8 "Selected Contract Card Frame" |
| PixelPortrait / PixelSprite | `src/world/pixel-ui/PixelPortrait.tsx`, `PixelSprite.tsx` | `.pixel-portrait`, `.pixel-sprite` | Yes — neutral fallback and abstract threat | Original governed runtime primitives; cartridge roles override them through the appearance seam |
| PixelDoll / PixelDollPortrait | `src/world/pixel-ui/PixelDoll.tsx`, `PixelDollPortrait.tsx` | `.pixel-doll`, `.pixel-doll-portrait` | Yes — roster, Hall, Encounter, Aperture | Governed renderers over theme-owned appearance specs; contain no cartridge identity themselves |
| First Charter role pack | `src/world/themes/first-charter/role-appearances.tsx` | appearance ids `first-charter:*` | Yes — every authored role across roster and staged scenes | Redrawn derivative — committed First Charter reference sheet |
| Waking Tower role pack | `src/world/themes/karazhan/role-appearances.tsx` | appearance ids `karazhan:*` | Yes — every authored raid role across roster and staged scenes | Original governed asset — `karazhan_white_label_asset_pack.svg` (legacy path/id retained for custody compatibility) |
| Ilyon role/founder pack | `src/world/themes/ilyon/portrait-icons.tsx` | appearance ids `ilyon:*` | Yes — every authored role and exact founder in roster/Aperture | Original governed asset — `ilyon_white_label_asset_pack.svg` and `ILYON_ASSET_BIBLE.md` |
| MotifIcon (Waking Tower) | `src/world/themes/karazhan/motif-icons.tsx` | `.kz-motif-icon` | Yes — Board, bay, Encounter | Original governed asset — committed Waking Tower white-label reference |
| MotifIcon (Ilyon) | `src/world/themes/ilyon/motif-icons.tsx` | `.ilyon-motif-icon` | Yes — Board, bay, Aperture evidence/faction/consequence records | Original governed asset — committed Ilyon white-label reference |
| MotifIcon (First Charter) | `src/world/themes/first-charter/motif-icons.tsx` | `.fc-motif-icon` | Yes — EncounterDirector overlay (replaces emoji glyphs) | Redrawn derivative — `first_charter_theme_asset_pack_overview.png` §1 "Motif Icons" (per-motif breakdown below) |
| RodohRuntimeMark | `src/world/brand/RodohRuntimeMark.tsx` | (inline styles, no CSS class prefix) | Yes — boot screen, cartridge surfaces, and decisions | Governed source map — exact 16x18 `SCGPX.MAP` published by the [AXM Tools identity system](https://bigbirdreturns.github.io/axm-tools/identity/); no redraw or centering |

## PixelIcon per-icon provenance

**Revision 2 (extraction pass).** Every `PixelIconName` is now a 32x32
pixel-grid SVG (`src/world/pixel-ui/PixelIcon.tsx`, `GRIDS` map), generated
programmatically from `axm_world_runtime_ui_asset_pack.png` rather than
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
| available | `...asset_pack.png` §1 "Contract State Icons" — document/page icon | close — page, fold corner, highlight dot, 3 text bars |
| reliable | `...asset_pack.png` §1 — shield with white star | close — full shield + 5-point star, extracted directly |
| risky | `...asset_pack.png` §1 — gold diamond with exclamation | close — diamond + exclamation mark |
| failing | `...asset_pack.png` §1 — red skull | close — skull, eye sockets, nose, teeth |
| locked | `...asset_pack.png` §1 / §6 — padlock | close — shackle + body + keyhole |
| recorded | `...asset_pack.png` §1 — stacked lines / ledger | close — charcoal ledger body + 3 bars |
| selected | `...asset_pack.png` §1 — filled tile + corner-bracket viewfinder frame | approximate — filled tile extracted cleanly; the 4 corner brackets are a disconnected fragment the extraction dropped |
| lootAvailable | `...asset_pack.png` §1 / §6 — treasure chest with sparkle accents | approximate — chest with clasp band extracted cleanly; the orbiting sparkle accents are disconnected fragments the extraction dropped |
| vanguard | `...asset_pack.png` §2 "Role Badges" — nested shield-in-shield | close — outer shield + inner white shield + inner teal shield |
| skirmisher | `...asset_pack.png` §2 — shield with crossed swords | close — shield + crossed blades |
| mender | `...asset_pack.png` §2 — shield with white cross | close — shield + cross, extracted directly |
| power | `...asset_pack.png` §3 "Attribute Icons" — clenched fist | close — fist with visible knuckles/fingers |
| mettle | `...asset_pack.png` §3 — gold shield with highlight stripe | close — shield + highlight |
| wits | `...asset_pack.png` §3 — angled blue book | close — book body, spine, page-edge stripes |
| spirit | `...asset_pack.png` §3 — teal flame with dark/white core | close — flame silhouette + core detail |
| rustyBlade | `...asset_pack.png` §4 "Starter Item Icons" — silver sword | close — full blade, crossguard, hilt |
| guardCharm | `...asset_pack.png` §4 — medallion on a ring loop | close — ring loop + medallion, extracted as one merged region |
| fieldSatchel | `...asset_pack.png` §4 — brown satchel with flap/buckle | close — satchel body, flap, buckle (fixed a bounding-box bug that had split it into two fragments) |
| emptySlot | `...asset_pack.png` §4 — dashed corner-bracket outline | close — both corner brackets merged into one icon (fixed a bounding-box bug that mapped this slot to a stray fragment of fieldSatchel) |

## MotifIcon per-motif provenance

`src/world/themes/first-charter/motif-icons.tsx` — 16x16 viewBox SVG paths,
also redrawn derivatives, not slices.

| motif | harvested source | match quality |
|---|---|---|
| dandelion | [AXM Tools identity system](https://bigbirdreturns.github.io/axm-tools/identity/) → `SCGPX.MAP` | exact — shared `RodohDandelionGlyph`; one governed map across brand, cartridge, and decision surfaces |
| archiveBox | `...overview.png` §1 — wooden reinforced crate | approximate — box outline + reinforcement line |
| coffeeMug | `...overview.png` §1 — mug with handle | close — mug body + handle |
| crossedCalendar | `...overview.png` §1 — torn calendar page, spiral top, crossed-off | close — page + binding marks + diagonal cross |
| receiptTab | `...overview.png` §1 — deckle-edge paper tab with lines | close — scalloped-bottom tab + text lines |
| notebook | `...overview.png` §1 — spiral-bound notebook | close — cover + spine + lines |
| starSpark | `...overview.png` §1 — 4-point sparkle | close — 4-point star |

### The Waking Tower theme motifs

`src/world/themes/karazhan/motif-icons.tsx` — 16x16 viewBox SVG paths, one per
legacy encounter id (`attumen`…`magtheridon` + the tower default). Provenance level:
**original governed asset**. Source:
`docs/design/references/karazhan_white_label_asset_pack.svg` (legacy filename
retained for compatibility), governed by `docs/design/KARAZHAN_ASSET_BIBLE.md`.
The paths are hand-authored runtime derivatives of the committed per-encounter
motifs rather than image slices.
The violet-night palette (§6) is applied as scoped CSS
(`karazhan.css`, under `:root[data-cartridge="karazhan"]`), not new pixel grids.

## Acceptance rule

A component only counts as "integrated" when it appears in this table with
"Yes" in the gameplay column **and** the corresponding gameplay file actually
imports it (verified by `tests/world/pixel-ui-integration.test.ts`). Appearing
only in `/rodoh/ui-kit` is not integration — it is a demo. `PixelFrame` (a
newly invented placeholder decorative wrapper with no justified gameplay use)
was removed entirely rather than left to bit-rot as dead code — it is no
longer part of this inventory.

Every `PixelIcon` shape above is a **redrawn derivative** extracted directly
from `axm_world_runtime_ui_asset_pack.png` by the pipeline described above
— not a harvested asset (it's a generated grid, not the source file) and not
a newly invented placeholder (every shape traces a real icon on the sheet).
Two icons (`selected`, `lootAvailable`) are missing a minor accent that was a
disconnected fragment in the source image; everything else is a close match.
Other `MotifIcon` shapes remain hand-authored SVG paths. The dandelion is the
exception: it imports the exact governed `RodohDandelionGlyph` map so no
surface can redraw, center, or tidy it independently.
