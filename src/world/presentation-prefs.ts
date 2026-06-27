// Per-arc costume preference. Each arc opens in the costume that best serves it (a
// tiered management arc -> the board; a flat one -> the map), and the player's manual
// choice is remembered. Idea harvested from Codex PR #3, adapted to the live world
// costume ids (board | globe | map) so there's one presentation system, not two.

import type { Arc } from "../engine/types.js";

export type CostumeId = "board" | "globe" | "map";

const KEY = "axm-world:costume:v1";

export function isCostumeId(value: string | null | undefined): value is CostumeId {
  return value === "board" || value === "globe" || value === "map";
}

/** Heuristic default: tiered, multi-contract arcs are management → board; else map. */
export function preferredCostumeForArc(arc: Arc): CostumeId {
  const tiered = arc.challenges.length > 1 && arc.progressionTiers.length > 0;
  return tiered ? "board" : "map";
}

export function loadCostume(arc: Arc): CostumeId {
  try {
    const saved = localStorage.getItem(`${KEY}:${arc.meta.id}`);
    if (isCostumeId(saved)) return saved;
  } catch {
    /* no localStorage (SSR/headless) — fall through to heuristic */
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
