# First Charter Hall production slice

## Status

This is AXM World's first runtime-loaded cartridge art vertical slice. It upgrades the actual First Charter Hall with three standalone original assets:

- a 1600×900 founding-hall environment;
- a 640×800 portrait of Maren Vos, Charter-Keeper;
- a 1600×900 foreground and architectural framing layer.

The slice is deliberately bounded. It proves the asset-production, provenance, responsive-dispatch, and browser-validation path for one important runtime surface. It does not claim that The First Charter, The Waking Tower, The Kind Gods of Ilyon, or Dark Tomb already possess complete production asset libraries.

## Runtime authority

The asset files live under `src/assets/first-charter/hall/` and are loaded by Vite through `src/world/themes/first-charter/first-charter.css`.

The environment and foreground frame apply to both Hall implementations:

- the directed First Charter Hall in `src/world/experience/ExperienceHost.tsx`;
- the reusable Hall representation rooted at `data-testid="hall-scene"`.

Maren's portrait replaces the directed Hall's generated initial-card treatment without altering her authored identity, dialogue, contract custody, or engine behavior. Existing code-native dolls remain the gameplay-body representation; this slice does not silently replace the broader character pipeline.

## Provenance

`src/assets/first-charter/hall/provenance.json` is the machine-readable receipt. The three SVG compositions were authored specifically for this repository. No stock image, external illustration, third-party source file, or generated model-weight artifact was incorporated.

The SVGs remain source-readable and versionable. They include semantic titles or descriptions where they convey content, fixed view boxes, and explicit responsive intent.

## Responsive and access behavior

Desktop preserves the charter window, table, Maren portrait, and architectural framing as a composed Hall. Mobile uses a tighter crop and smaller portrait while retaining the active cartridge and player controls. The framing layer never owns pointer input.

Forced-colors mode removes decorative environment and framing images rather than obscuring system colors or interaction boundaries. The Hall remains usable through its structural HTML and existing authored text. Reduced-motion behavior is unchanged because these assets introduce no required animation.

## Acceptance contract

The slice is accepted only when all of the following pass on one exact candidate SHA:

1. the assets exist as standalone files and match the provenance manifest;
2. the production build resolves every Vite asset URL;
3. desktop Chromium loads all three assets at their declared natural dimensions and captures a Hall screenshot;
4. mobile Chromium loads all three assets at their declared natural dimensions and captures a Hall screenshot;
5. existing Hall, campaign, custody, accessibility, Vitest, and complete desktop/mobile browser gates remain green.

The browser screenshots are CI artifacts and visual receipts. They are evidence that the actual runtime loaded and presented the slice, rather than documentation-board mockups.

## Generalization rule

Waking Tower and Ilyon production work should reuse this contract only after this slice passes in the browser. Their assets must remain cartridge-owned and materially distinct. The implementation seam may generalize, but the visual vocabulary must not collapse into recolored First Charter art.
