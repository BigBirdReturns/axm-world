// Program run persistence -- digest-guarded. A save only ever restores into the
// SAME authored program: loadRun returns null unless the stored authoredArcDigest
// matches the program's identity (and the engine's arc-id guard also holds). So
// custody state can never spoof identity, and a save from a different authored
// cartridge is simply ignored (the caller boots fresh).
//
// The org is (de)serialized with the engine's own serializeGame/deserializeGame
// (version + arcRef guard + migrations); this module adds the digest guard and
// carries the run ledger alongside.

import type { Arc, Organization } from "../engine/types.js";
import { serializeGame, deserializeGame } from "../engine/save.js";
import { emptyLedger, type Ledger } from "./ledger.js";

/** Save schema version. Kept in lockstep with PROGRAM_001.saveSchemaVersion. */
export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_KEY = "axm-world:save:v1";

/** The minimal storage surface this module needs -- localStorage satisfies it
 *  structurally, and tests pass a fake. Avoids a hard DOM `Storage` dependency. */
export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProgramRunState {
  org: Organization;
  ledger: Ledger;
}

interface StoredSave {
  version: number;
  authoredArcDigest: string;
  /** Engine serializeGame(org, arc) output. */
  game: string;
  ledger: Ledger;
}

/** Persist a program's run state under the authored-arc digest. */
export function saveRun(
  storage: KVStorage,
  params: { arc: Arc; authoredArcDigest: string; state: ProgramRunState },
): void {
  const stored: StoredSave = {
    version: SAVE_SCHEMA_VERSION,
    authoredArcDigest: params.authoredArcDigest,
    game: serializeGame(params.state.org, params.arc),
    ledger: params.state.ledger,
  };
  storage.setItem(SAVE_KEY, JSON.stringify(stored));
}

/** Load a program's run state IF the stored save matches this program's authored
 *  identity (digest guard) and arc. Returns null when there is no save, when the
 *  save belongs to a different authored program, or when it is unreadable. */
export function loadRun(
  storage: KVStorage,
  params: { arc: Arc; authoredArcDigest: string },
): ProgramRunState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  let parsed: Partial<StoredSave>;
  try {
    parsed = JSON.parse(raw) as Partial<StoredSave>;
  } catch {
    return null;
  }
  if (parsed.version !== SAVE_SCHEMA_VERSION) return null;
  if (parsed.authoredArcDigest !== params.authoredArcDigest) return null; // different program
  if (typeof parsed.game !== "string") return null;
  let org: Organization;
  try {
    ({ org } = deserializeGame(parsed.game, params.arc));
  } catch {
    return null; // arc mismatch / corrupt engine save
  }
  return { org, ledger: normalizeLedger(parsed.ledger, params.authoredArcDigest) };
}

export function clearRun(storage: KVStorage): void {
  storage.removeItem(SAVE_KEY);
}

function normalizeLedger(ledger: unknown, authoredArcDigest: string): Ledger {
  if (
    !!ledger &&
    typeof ledger === "object" &&
    Array.isArray((ledger as Ledger).entries) &&
    (ledger as Ledger).authoredArcDigest === authoredArcDigest
  ) {
    return ledger as Ledger;
  }
  return emptyLedger(authoredArcDigest);
}
