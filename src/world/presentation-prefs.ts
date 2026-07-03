// Per-arc costume preference. Each cartridge opens in the costume that best serves
// it, and the player's manual choice is remembered.

import type { Arc } from "../engine/types.js";

export type CostumeId = "board" | "map" | "globe" | "graph";

const KEY = "axm-world:costume:v1";

export function isCostumeId(value: string | null | undefined): value is CostumeId {
  return value === "board" || value === "map" || value === "globe" || value === "graph";
}

/** Default costume for an arc. 2D contract board is the lightweight default. */
export function preferredCostumeForArc(_arc: Arc): CostumeId {
  return "board";
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
