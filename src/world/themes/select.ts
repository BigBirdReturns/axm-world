// Cartridge theme selection seam. The runtime shell never hardcodes a single
// cartridge's identity; it asks these functions which theme, motif set, and
// palette scope apply to the active arc. Unknown/imported arcs resolve to the
// base Rodoh theme with NO palette scope, so they render in the neutral runtime
// skin — never accidentally wearing another cartridge's clothes.

import type { Arc } from "../../engine/types.js";
import { RODOH_BASE_THEME, type RodohTheme } from "./rodoh.js";
import { FIRST_CHARTER_THEME } from "./first-charter/theme.js";
import { KARAZHAN_THEME } from "./karazhan/theme.js";
import { ILYON_THEME } from "./ilyon/theme.js";
import { LAMP_DISTRICT_THEME } from "./lamp-district/theme.js";
import type { PaletteBand } from "../planet/palette.js";

/** The full RodohTheme (vocabulary, mottos, icon map, appearance pack) for an arc. */
export function themeForArc(arc: Arc): RodohTheme {
  switch (arc.meta.id) {
    case LAMP_DISTRICT_THEME.id:
      return LAMP_DISTRICT_THEME;
    case ILYON_THEME.id:
      return ILYON_THEME;
    case KARAZHAN_THEME.id:
      return KARAZHAN_THEME;
    case FIRST_CHARTER_THEME.id:
      return FIRST_CHARTER_THEME;
    default:
      return RODOH_BASE_THEME;
  }
}

/** The value for the <html data-cartridge> attribute, or null when the arc has
 * no bundled skin. Unknown/imported arcs render in the neutral runtime skin. */
export function cartridgePaletteScope(arc: Arc): string | null {
  if (arc.meta.id === LAMP_DISTRICT_THEME.id) return "lamp-district";
  if (arc.meta.id === ILYON_THEME.id) return "ilyon";
  if (arc.meta.id === KARAZHAN_THEME.id) return "karazhan";
  if (arc.meta.id === FIRST_CHARTER_THEME.id) return "first-charter";
  return null;
}

/** Whether this arc has a bundled encounter-motif set. */
export function hasCartridgeMotifs(arc: Arc): boolean {
  return arc.meta.id === LAMP_DISTRICT_THEME.id
    || arc.meta.id === ILYON_THEME.id
    || arc.meta.id === FIRST_CHARTER_THEME.id
    || arc.meta.id === KARAZHAN_THEME.id;
}


const FIRST_CHARTER_PLANET: PaletteBand[] = [
  { max: 0.34, color: [0.10, 0.24, 0.29] },
  { max: 0.40, color: [0.18, 0.43, 0.45] },
  { max: 0.46, color: [0.76, 0.66, 0.43] },
  { max: 0.62, color: [0.39, 0.52, 0.29] },
  { max: 0.76, color: [0.22, 0.36, 0.24] },
  { max: 0.90, color: [0.42, 0.35, 0.27] },
  { max: 1.01, color: [0.86, 0.82, 0.71] },
];

const KARAZHAN_PLANET: PaletteBand[] = [
  { max: 0.34, color: [0.07, 0.06, 0.12] },
  { max: 0.40, color: [0.15, 0.13, 0.25] },
  { max: 0.46, color: [0.34, 0.28, 0.44] },
  { max: 0.62, color: [0.24, 0.22, 0.32] },
  { max: 0.76, color: [0.16, 0.20, 0.25] },
  { max: 0.90, color: [0.30, 0.27, 0.34] },
  { max: 1.01, color: [0.63, 0.57, 0.72] },
];

const LAMP_DISTRICT_PLANET: PaletteBand[] = [
  { max: 0.34, color: [0.025, 0.02, 0.03] },
  { max: 0.40, color: [0.09, 0.07, 0.10] },
  { max: 0.46, color: [0.33, 0.23, 0.18] },
  { max: 0.62, color: [0.50, 0.39, 0.25] },
  { max: 0.76, color: [0.25, 0.30, 0.25] },
  { max: 0.90, color: [0.28, 0.22, 0.24] },
  { max: 1.01, color: [0.74, 0.64, 0.45] },
];

const ILYON_PLANET: PaletteBand[] = [
  { max: 0.34, color: [0.03, 0.14, 0.22] },
  { max: 0.40, color: [0.05, 0.43, 0.47] },
  { max: 0.46, color: [0.84, 0.74, 0.51] },
  { max: 0.62, color: [0.26, 0.58, 0.52] },
  { max: 0.76, color: [0.18, 0.38, 0.38] },
  { max: 0.90, color: [0.47, 0.39, 0.37] },
  { max: 1.01, color: [0.91, 0.89, 0.81] },
];

/** Cartridge-owned globe material without changing planet topology or play law. */
export function planetPaletteForArc(arc: Arc): PaletteBand[] | undefined {
  if (arc.meta.id === LAMP_DISTRICT_THEME.id) return LAMP_DISTRICT_PLANET;
  if (arc.meta.id === FIRST_CHARTER_THEME.id) return FIRST_CHARTER_PLANET;
  if (arc.meta.id === KARAZHAN_THEME.id) return KARAZHAN_PLANET;
  if (arc.meta.id === ILYON_THEME.id) return ILYON_PLANET;
  return undefined;
}
