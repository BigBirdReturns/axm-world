# Rodoh Visual Contract

Rodoh is the player-facing system identity. AXM-WORLD is the reusable runtime shell. The First Charter is one cartridge skin.

## Sources

Canonical reference sheets live in `docs/design/references/`:

- `rodoh_platform_identity_system_guide.png`
- `axm_world_runtime_ui_asset_pack.png`
- `first_charter_theme_asset_pack_overview.png`

The sheets are reference, not production slices. The repo implements them as tokens and reusable components.

## Runtime rules

- Use Rodoh state language: Available, Reliable, Risky, Failing, Locked, Recorded, Selected, Loot Ready.
- Yellow must explain how to become reliable. A risky check must show its current score, threshold, buffer shortfall, and best fix if one exists.
- Red must be unmistakable and must not look like a normal run state.
- Every action target should be at least 44px where practical and never below WCAG 2.2 AA target-size minimum without an equivalent target.
- Use progressive disclosure: show what matters for the selected contract first, details only when they affect the next action.
- Teach by doing: assign, fix, run, record, loot, equip.

## Cartridge access to the buffaloes

Every cartridge can use the shared `src/world/pixel-ui/` components and `src/world/themes/rodoh.ts` mappings. A cartridge-specific skin can extend the base theme under `src/world/themes/<cartridge>/` without changing the runtime shell.

## Anti-goals

- Do not hardcode First Charter motifs into generic runtime components.
- Do not invent fake gear or fake stat effects.
- Do not use tutorial copy to patch unclear state.
- Do not let Planet/Run Graph views own interaction state.
