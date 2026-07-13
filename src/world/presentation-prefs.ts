// Per-arc costume preference. Each cartridge opens in the costume that best serves
// it, and the player's manual choice is remembered.

import type { Arc } from "../engine/types.js";
import { themeForArc } from "./themes/select.js";

export type CostumeId = "board" | "map" | "globe" | "graph" | "hall";

const KEY = "axm-world:costume:v1";

export function isCostumeId(value: string | null | undefined): value is CostumeId {
  return value === "board" || value === "map" || value === "globe" || value === "graph" || value === "hall";
}

/** Default costume is authored by the cartridge theme. Unknown/imported
 * cartridges inherit Rodoh's lightweight board default. */
export function preferredCostumeForArc(arc: Arc): CostumeId {
  return themeForArc(arc).preferredPresentation;
}

export function loadCostume(arc: Arc): CostumeId {
  try {
    const saved = localStorage.getItem(`${KEY}:${arc.meta.id}`);
    if (isCostumeId(saved)) return saved;
  } catch {
    /* no localStorage (headless) — fall through to heuristic */
  }
  return preferredCostumeForArc(arc);
}

export function saveCostume(arc: Arc, id: CostumeId): void {
  try {
    localStorage.setItem(`${KEY}:${arc.meta.id}`, id);
  } catch {
    /* ignore */
  }
}
