// Program of record — the controlled playable artifact RODOH loads, resumes,
// tests, and proves.
//
// This is NOT a procurement label. It is the binding between a cartridge's
// AUTHORED identity and the runtime surfaces + schema versions that make it a
// program. The authored-arc digest is DERIVED from the cartridge
// (cartridgeIdentity) — never a claimed manifest value — so board, sim, ledger,
// world state, and saved results all resolve to the same anchor.

import { cartridgeIdentity } from "./cartridge-identity.js";
import { FIRST_CHARTER_CARTRIDGE, LAMP_DISTRICT_CARTRIDGE, RELIEF_CIRCUIT_CARTRIDGE } from "./cartridge.js";
import type { Cartridge } from "./cartridge.js";

/** Runtime surfaces a program may project. Presentation-only labels — the engine
 *  owns outcomes, RODOH owns rendering. */
export type RuntimeSurface = "board" | "encounter" | "result" | "ledger" | "world" | "aperture" | "underworld" | "common-ship";
export type EntryExperience = "guided-first-contract" | "direct-to-runtime";

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
  /** Presentation-only entry direction. It cannot alter Arc law or resolution. */
  entryExperience: EntryExperience;
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
    entryExperience?: EntryExperience;
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
    entryExperience: opts.entryExperience ?? "direct-to-runtime",
    saveSchemaVersion: opts.saveSchemaVersion,
    ledgerSchemaVersion: opts.ledgerSchemaVersion,
  };
}

/** Program 001 — The First Charter as the first RODOH-loaded playable program of
 *  record. Runtime surfaces are the full single-contract loop; schema versions
 *  start at 1. */
export const PROGRAM_001: ProgramOfRecord = defineProgram("program-001", FIRST_CHARTER_CARTRIDGE, {
  runtimeSurfaces: ["board", "encounter", "result", "ledger", "world", "aperture"],
  entryExperience: "guided-first-contract",
  saveSchemaVersion: 1,
  // Ledger schema 2: entries carry a structured consequence record (#69). Kept in
  // lockstep with LEDGER_SCHEMA_VERSION (ledger-schema-lockstep.test.ts enforces it).
  ledgerSchemaVersion: 2,
});

/** Program 004 — The Lamp District. It enters the common Underworld receiver
 * directly and carries one exact engine-owned Tomb state through every surface. */
export const PROGRAM_004: ProgramOfRecord = defineProgram("program-004", LAMP_DISTRICT_CARTRIDGE, {
  runtimeSurfaces: ["underworld", "board", "encounter", "result", "ledger", "world", "aperture"],
  entryExperience: "direct-to-runtime",
  saveSchemaVersion: 1,
  ledgerSchemaVersion: 2,
  extraAssets: {
    "lamp-district-environment": "original:lamp-district-environment@1",
    "anja-vei-portrait": "original:anja-vei-portrait@1",
    "lamp-district-cross-section": "original:lamp-district-cross-section@1",
  },
});

/** Program 005 — The Relief Circuit. Arc owns Common Watch composition,
 * ship-state transitions, handoff, precedent, and the connected Lamp District
 * operation; World presents those receipts through the Common Ship surface. */
export const PROGRAM_005: ProgramOfRecord = defineProgram("program-005", RELIEF_CIRCUIT_CARTRIDGE, {
  runtimeSurfaces: ["common-ship", "board", "encounter", "result", "ledger", "world", "aperture"],
  entryExperience: "direct-to-runtime",
  saveSchemaVersion: 1,
  ledgerSchemaVersion: 2,
  extraAssets: {
    "relief-circuit-environment": "original:relief-circuit-environment@1",
    "relief-circuit-cross-section": "original:relief-circuit-cross-section@1",
    "relief-circuit-symbol-atlas": "original:relief-circuit-symbol-atlas@1",
    "relief-circuit-cast": "original:relief-circuit-cast@1",
  },
});

/** Every cartridge RODOH treats as a controlled program of record. Keyed by
 *  authored-arc digest at lookup, never by manifest claim. Numbering preserves
 *  the accepted release lineage, so gaps are historical rather than implicit
 *  programs. A cartridge outside this registry remains fully playable; it boots
 *  as an ordinary holder-owned cartridge rather than a program of record. */
export const PROGRAMS_OF_RECORD: readonly ProgramOfRecord[] = [PROGRAM_001, PROGRAM_004, PROGRAM_005];

/** The program of record a cartridge IS, matched by its COMPUTED authored
 *  identity (cartridgeIdentity) — never a claimed manifest value — or null if
 *  this cartridge is not a program of record. This is the digest-law-respecting
 *  binding the boot plaque uses to decide whether to present a cartridge as a
 *  program of record. */
export function programForCartridge(cartridge: Cartridge): ProgramOfRecord | null {
  const digest = cartridgeIdentity(cartridge);
  return PROGRAMS_OF_RECORD.find((p) => p.authoredArcDigest === digest) ?? null;
}
