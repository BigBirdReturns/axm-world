// Per-cartridge-revision representation preference. Each exact authored program
// remembers the player's manual choice without allowing a same-id revision to
// inherit another revision's presentation state.

import type { Arc } from "../engine/types.js";
import { cartridgeDigest } from "../engine/cartridge-digest.js";
import { storageWriteFailure, type StorageWriteResult } from "./storage-result.js";

export type CostumeId = "board" | "map" | "globe" | "graph" | "hall" | "aperture" | "underworld" | "common-ship";

const KEY = "axm-world:costume:v2";

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function isCostumeId(value: string | null | undefined): value is CostumeId {
  return value === "board"
    || value === "map"
    || value === "globe"
    || value === "graph"
    || value === "hall"
    || value === "aperture"
    || value === "underworld"
    || value === "common-ship";
}

/** Default representation for an arc. 2D contract board is the lightweight floor. */
export function preferredCostumeForArc(arc: Arc): CostumeId {
  if (arc.meta.domain === "godscar-dark-tomb") return "underworld";
  if (arc.meta.domain === "godscar-common-ship") return "common-ship";
  return "board";
}

export function costumeKey(arc: Arc): string {
  return `${KEY}:${cartridgeDigest(arc)}`;
}

export function loadCostume(arc: Arc, storage: PreferenceStorage = localStorage): CostumeId {
  try {
    const saved = storage.getItem(costumeKey(arc));
    if (isCostumeId(saved)) return saved;
  } catch {
    /* no localStorage (headless) — fall through to heuristic */
  }
  return preferredCostumeForArc(arc);
}

export function saveCostume(
  arc: Arc,
  id: CostumeId,
  storage: PreferenceStorage = localStorage,
): StorageWriteResult {
  try {
    storage.setItem(costumeKey(arc), id);
    return { ok: true };
  } catch (error) {
    return storageWriteFailure(error, "Saving the representation preference");
  }
}

export function clearCostume(
  arc: Arc,
  storage: PreferenceStorage = localStorage,
): StorageWriteResult {
  try {
    storage.removeItem(costumeKey(arc));
    return { ok: true };
  } catch (error) {
    return storageWriteFailure(error, "Clearing the representation preference");
  }
}
