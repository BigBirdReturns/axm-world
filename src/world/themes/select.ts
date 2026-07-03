// Cartridge theme selection seam. The runtime shell never hardcodes a single
// cartridge's identity; it asks these functions which theme, motif set, and
// palette scope apply to the active arc. Unknown/imported arcs (Operations Lab
// and anything a player loads) resolve to the base Rodoh theme with NO palette
// scope, so they render in the neutral runtime skin — never accidentally
// wearing another cartridge's clothes.

import type { Arc } from "../../engine/types.js";
import { RODOH_BASE_THEME, type RodohTheme } from "./rodoh.js";
import { FIRST_CHARTER_THEME } from "./first-charter/theme.js";
import { KARAZHAN_THEME } from "./karazhan/theme.js";

/** The full RodohTheme (vocabulary, mottos, icon map) for an arc. */
export function themeForArc(arc: Arc): RodohTheme {
  switch (arc.meta.id) {
    case KARAZHAN_THEME.id:
      return KARAZHAN_THEME;
    case FIRST_CHARTER_THEME.id:
      return FIRST_CHARTER_THEME;
    default:
      return RODOH_BASE_THEME;
  }
}

/** The value for the <html data-cartridge> attribute, or null when the arc has
 *  no bundled skin (so no scoped CSS applies). Both bundled cartridges carry a
 *  distinct material identity; unknown/imported arcs (Operations Lab) return
 *  null and render in the neutral runtime skin. */
export function cartridgePaletteScope(arc: Arc): string | null {
  if (arc.meta.id === KARAZHAN_THEME.id) return "karazhan";
  if (arc.meta.id === FIRST_CHARTER_THEME.id) return "first-charter";
  return null;
}

/** Whether this arc has a bundled encounter-motif set. */
export function hasCartridgeMotifs(arc: Arc): boolean {
  return arc.meta.id === FIRST_CHARTER_THEME.id || arc.meta.id === KARAZHAN_THEME.id;
}
