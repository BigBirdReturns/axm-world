// Program of record — the controlled playable artifact RODOH loads, resumes,
// tests, and proves.
//
// This is NOT a procurement label. It is the binding between a cartridge's
// AUTHORED identity and the runtime surfaces + schema versions that make it a
// program. The authored-arc digest is DERIVED from the cartridge
// (cartridgeIdentity) — never a claimed manifest value — so board, sim, ledger,
// world state, and saved results all resolve to the same anchor.

import { cartridgeIdentity } from "./cartridge-identity.js";
import { FIRST_CHARTER_CARTRIDGE } from "./cartridge.js";
import type { Cartridge } from "./cartridge.js";

/** Runtime surfaces a program may project. Presentation-only labels — the engine
 *  owns outcomes, RODOH owns rendering. */
export type RuntimeSurface = "board" | "encounter" | "result" | "ledger" | "world";

export interface ProgramOfRecord {
  /** Stable program-of-record id, e.g. "program-001". */
  programId: string;
  /** The bound cartridge's id and name (from its manifest). */
  cartridgeId: string;
  cartridgeName: string;
  /** Content identity of the AUTHORED arc — derived via cartridgeIdentity, never
   *  claimed. Every runtime surface must resolve to this exact value. */
  authoredArcDigest: string;
  /** Bundled assets this program depends on, keyed by asset id → authored-arc
   *  digest. The cartridge itself is always present under its own id. */
  bundledAssets: Readonly<Record<string, string>>;
  /** Runtime surfaces RODOH may project for this program. */
  runtimeSurfaces: readonly RuntimeSurface[];
  /** Persistence (save) schema version this program reads/writes. */
  saveSchemaVersion: number;
  /** Ledger schema version this program writes. */
  ledgerSchemaVersion: number;
}

/** Bind a cartridge into a program of record. The authored-arc digest is
 *  computed from the cartridge, so the manifest (trust, signature) cannot spoof
 *  a program's identity. */
export function defineProgram(
  programId: string,
  cartridge: Cartridge,
  opts: {
    runtimeSurfaces: readonly RuntimeSurface[];
    saveSchemaVersion: number;
    ledgerSchemaVersion: number;
    extraAssets?: Readonly<Record<string, string>>;
  },
): ProgramOfRecord {
  const authoredArcDigest = cartridgeIdentity(cartridge);
  return {
    programId,
    cartridgeId: cartridge.manifest.id,
    cartridgeName: cartridge.manifest.name,
    authoredArcDigest,
    bundledAssets: { [cartridge.manifest.id]: authoredArcDigest, ...(opts.extraAssets ?? {}) },
    runtimeSurfaces: opts.runtimeSurfaces,
    saveSchemaVersion: opts.saveSchemaVersion,
    ledgerSchemaVersion: opts.ledgerSchemaVersion,
  };
}

/** Program 001 — The First Charter as the first RODOH-loaded playable program of
 *  record. Runtime surfaces are the full single-contract loop; schema versions
 *  start at 1. */
export const PROGRAM_001: ProgramOfRecord = defineProgram("program-001", FIRST_CHARTER_CARTRIDGE, {
  runtimeSurfaces: ["board", "encounter", "result", "ledger", "world"],
  saveSchemaVersion: 1,
  ledgerSchemaVersion: 1,
});
