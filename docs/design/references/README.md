# Rodoh Visual Reference Sheets

This folder holds the canonical design reference assets named in
`docs/design/rodoh-visual-contract.md` ("the buffalo"), plus supporting
material authored during runtime integration.

## Canonical harvested assets (present)

These are the original reference sheets named in the visual contract. They are
real hand-drawn pixel-art reference sheets, not slices or exports of any
production sprite — the contract explicitly says "the sheets are reference,
not production slices."

- `01_rodoh_platform_identity_system_guide.png` — Rodoh brand identity: core
  palette, wordmark, root motifs (threshold/dandelion/record-seal/cartridge),
  runtime UI component language (button states, panel frames, chips, status
  badges), badges & chips library, type & spacing guide.
- `02_axm_world_runtime_ui_asset_pack.png` — the primary source for
  `PixelIcon`: contract state icons (available/reliable/risky/failing/
  locked/recorded/selected/loot-available), role badges (vanguard/skirmisher/
  mender), attribute icons (power/mettle/wits/spirit), starter item icons
  (rusty blade/guard charm/field satchel/empty slot), button states, UI
  controls, meter pieces, UI frame exports, 9-slice breakdowns, palette
  tokens.
- `03_first_charter_theme_asset_pack_overview.png` — the source for
  `src/world/themes/first-charter/motif-icons.tsx`: motif icons (dandelion,
  archive box, coffee mug, crossed-off calendar, receipt tab, notebook, star
  spark), themed state/progress symbols, cartridge-skin UI pieces, theme
  palette tokens.
- `AXM-WORLD Logo Pack.html` — logo/wordmark reference, titled
  "AXM-WORLD · Logo & Asset Pack" (recovered from an upload-mangled filename;
  see note below).

Import note: these three PNGs and the logo pack HTML were named in the visual
contract from the start of this work but were **not present in the repo**
when the pixel-ui components below were first built. They were added to
`main` directly (outside this branch) partway through implementation, then
merged into this branch and had their filenames/paths normalized (the upload
process had mangled `docs/design/references/AXM-WORLD Logo Pack.html` to
`AXM-WORLD20Pack.html`, and `docs/design/harvest/rodoh-buffalo-harvest.zip`
to `docs/design/references/rodoh-buffalo-harvest (1).zip`).

## Harvest bundle

- `docs/design/harvest/rodoh-buffalo-harvest.zip` — the full harvest package:
  the three reference PNGs, a sanitized no-font HTML export of the standalone
  AXM-WORLD/AXM-ARC prototypes, a standalone inventory JSON, and the
  `pixel-ui`/`first-charter` starter source this repo was originally
  bootstrapped from. Its `README.md` explicitly instructs: "Do not slice the
  reference sheets directly into production UI. Convert them into tokens,
  components, and a small controlled icon set." That instruction is why
  `PixelIcon` and `motif-icons.tsx` are redrawn 8x8 pixel-grid derivatives
  (see `component-inventory.md`), not exported slices of the PNGs.
- `docs/design/harvest/AXM-WORLD.template.no-fonts.html`,
  `AXM-ARC.template.no-fonts.html`, `standalone_inventory.json` — extracted
  from the harvest zip's `dist-harvest/` folder: the no-font HTML exports and
  standalone inventory referenced in the QA checklist.

## Other files in this folder

- `pixel-ui-reference.html` — static, no-font HTML reference sheet authored
  during runtime integration (not part of the harvested payload). Renders
  every pixel-ui component and First Charter motif using the same CSS tokens
  as the live runtime. Useful for design review without running the app, but
  it is not a source-of-truth asset — the harvested PNGs above are.
- `component-inventory.md` — per-component provenance: harvested asset,
  redrawn derivative, or newly invented placeholder, plus gameplay usage.

## Live equivalent

The live, interactive equivalent of the harvested reference sheets is the
in-app dev route at `/rodoh/ui-kit` (`src/world/dev/RodohUiKitRoute.tsx`),
which renders the actual React components rather than a static mockup. Its
copy states plainly which icons are redrawn derivatives of the sheets above
and cites the sheet + section each one comes from.
