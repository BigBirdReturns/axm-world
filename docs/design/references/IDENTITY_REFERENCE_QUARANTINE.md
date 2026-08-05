# Rodoh identity reference quarantine

The following files are retained only as historical applications and design evidence. They are not source authority for the Rodoh runtime mark and must not be cited by runtime code, asset tests, or future redesigns as a coordinate master.

## Quarantined applications

- `rodoh_platform_identity_system_guide.png`
  - Status: application screenshot.
  - Known defect: the runtime mark was redrawn from this image into a 14×18 implementation with an undeclared palette and drop shadow.
  - Permitted use: historical review only.
  - Prohibited use: coordinate extraction, palette extraction, redraw, or source citation.

- `AXM-WORLD Logo Pack.html`
  - Status: application and export reference.
  - Known defect: it describes an incompatible 13×19 grid as a pixel-exact master and permits hand-hinted alternates.
  - Permitted use: historical review only.
  - Prohibited use: runtime source, alternate glyph authority, crop authority, or transform authority.

## Current authority

The only runtime source is `src/world/brand/rodoh-root-mark.ts`. Its coordinates are transcribed exactly from the root ledger in `BigBirdReturns/axm-tools@93a9740a26b0fafe5b5152103a8118a489afbcec`, `identity/scg/SCG_MARK_CONSTITUTION.md@6ce2a3a6262a1190764117ec04ce687a1708271c`.

The local custody manifest is `src/world/brand/rodoh-root-mark.provenance.json`. Any application that disagrees with the 16×16 map, cream `#fffdf5`, moss `#6B784D`, charcoal `#1B1818`, or the constitution's allowed transforms is wrong by construction.