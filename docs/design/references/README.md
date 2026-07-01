# Rodoh Visual Reference Sheets

This folder holds the design reference assets for the Rodoh pixel-ui system:
canonical color tokens, component anatomy, and the First Charter motif set.

- `pixel-ui-reference.html` — static, no-font HTML reference sheet. Open directly
  in a browser. Renders every pixel-ui component and First Charter motif using
  the same CSS tokens as the live runtime (`src/world/pixel-ui/pixel-ui.css`,
  `src/world/themes/first-charter/first-charter.css`). No web fonts, no build
  step — this is a plain artifact for design review, not a build target.
- `component-inventory.md` — the standalone inventory: every component name,
  its file path, its CSS class prefix, and whether it is used in live gameplay.

The live, interactive equivalent of this reference sheet is the in-app dev
route at `/rodoh/ui-kit` (`src/world/dev/RodohUiKitRoute.tsx`), which renders
the actual React components rather than a static mockup. If this HTML
reference and the live route ever disagree, the live route is correct — update
this file to match.
