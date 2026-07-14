// Program run persistence -- digest-guarded, and one save slot PER authored program.
// A save only ever restores into the SAME authored program: it lives under a key
// namespaced by the program's authored-arc digest, AND loadRun returns null unless
// the stored authoredArcDigest matches (and the engine's arc-id guard also holds).
// Per-program slots mean opening a second cartridge never clobbers the first's saved
// run; the in-payload digest guard is kept as defense-in-depth.
//
// The org is (de)serialized with the engine's own serializeGame/deserializeGame
// (version + arcRef guard + migrations); this module adds the digest guard and
// carries the run ledger + opening choice alongside.

import type { Arc, Organization } from "../engine/types.js";
import { serializeGame, deserializeGame } from "../engine/save.js";
import { emptyLedger, migrateLedger, summarizeLedger, type ContractOutcome, type Ledger } from "./ledger.js";

/** Save schema version. Kept in lockstep with PROGRAM_001.saveSchemaVersion. */
export const SAVE_SCHEMA_VERSION = 1;
/** Save-slot key prefix. Each authored program gets its OWN slot, keyed by its
 *  authored-arc digest (see saveKeyFor), so playing a second cartridge never
 *  overwrites the first program's saved run. */
export const SAVE_KEY_PREFIX = "axm-world:save:v1:";

/** The storage key for a specific authored program's save slot. */
export function saveKeyFor(authoredArcDigest: string): string {
  return `${SAVE_KEY_PREFIX}${authoredArcDigest}`;
}

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
  /** The opening decision label the player chose, persisted so the visible decision
   *  mark (and the export) survive a reload. Null until an opening choice is made;
   *  optional on input for callers that never surface an opening choice. */
  openingChoice?: string | null;
  /** Stable authored option id. Additive so old v1 saves continue to load. */
  openingChoiceId?: string | null;
}

interface StoredSave {
  version: number;
  authoredArcDigest: string;
  /** Engine serializeGame(org, arc) output. */
  game: string;
  ledger: Ledger;
  openingChoice: string | null;
  openingChoiceId?: string | null;
}

/** Persist a program's run state under its own authored-arc-digest slot. */
export function saveRun(
  storage: KVStorage,
  params: { arc: Arc; authoredArcDigest: string; state: ProgramRunState },
): void {
  const stored: StoredSave = {
    version: SAVE_SCHEMA_VERSION,
    authoredArcDigest: params.authoredArcDigest,
    game: serializeGame(params.state.org, params.arc),
    ledger: params.state.ledger,
    openingChoice: params.state.openingChoice ?? null,
    openingChoiceId: params.state.openingChoiceId ?? null,
  };
  storage.setItem(saveKeyFor(params.authoredArcDigest), JSON.stringify(stored));
}

/** Load a program's run state IF the stored save matches this program's authored
 *  identity (digest guard) and arc. Returns null when there is no save, when the
 *  save belongs to a different authored program, or when it is unreadable. */
export function loadRun(
  storage: KVStorage,
  params: { arc: Arc; authoredArcDigest: string },
): ProgramRunState | null {
  const raw = storage.getItem(saveKeyFor(params.authoredArcDigest));
  if (!raw) return null;
  let parsed: Partial<StoredSave>;
  try {
    parsed = JSON.parse(raw) as Partial<StoredSave>;
  } catch {
    return null;
  }
  if (parsed.version !== SAVE_SCHEMA_VERSION) return null;
  if (parsed.authoredArcDigest !== params.authoredArcDigest) return null; // defense-in-depth
  if (typeof parsed.game !== "string") return null;
  let org: Organization;
  try {
    ({ org } = deserializeGame(parsed.game, params.arc));
  } catch {
    return null; // arc mismatch / corrupt engine save
  }
  return {
    org,
    ledger: normalizeLedger(parsed.ledger, params.authoredArcDigest),
    openingChoice: typeof parsed.openingChoice === "string" ? parsed.openingChoice : null,
    openingChoiceId: typeof parsed.openingChoiceId === "string" ? parsed.openingChoiceId : null,
  };
}

export function clearRun(storage: KVStorage, authoredArcDigest: string): void {
  storage.removeItem(saveKeyFor(authoredArcDigest));
}

/** A read-only, boot-surface view of a program's save slot: enough to tell the
 *  player whether the program is fresh or resumable, and what it remembers,
 *  WITHOUT entering it. Derived from `loadRun`, so "present" means the same thing
 *  the boot flow's restore means — a save that belongs to THIS exact authored
 *  program (digest guard) and is actually restorable. Returns null when there is
 *  no such save. */
export interface ProgramSaveSummary {
  authoredArcDigest: string;
  /** Number of resolved contracts recorded in the saved ledger. */
  ledgerEntryCount: number;
  /** The most recently recorded contract (name + outcome), or null for a save
   *  that has resolved the opening but not yet run a contract. */
  lastResult: { challengeName: string; outcome: ContractOutcome } | null;
  /** The opening decision label the player chose, if any. */
  openingChoice: string | null;
}

/** Summarize a program's save slot for the cartridge bay. Reuses `loadRun`'s
 *  digest + schema + arc guards, so a summary is returned only when the run is
 *  genuinely resumable — the boot plaque never offers "Resume" for a save that
 *  restore would reject. */
export function readProgramSaveSummary(
  storage: KVStorage,
  params: { arc: Arc; authoredArcDigest: string },
): ProgramSaveSummary | null {
  const run = loadRun(storage, params);
  if (!run) return null;
  const { entryCount, lastResult } = summarizeLedger(run.ledger);
  return {
    authoredArcDigest: params.authoredArcDigest,
    ledgerEntryCount: entryCount,
    lastResult,
    openingChoice: run.openingChoice ?? null,
  };
}

function normalizeLedger(ledger: unknown, authoredArcDigest: string): Ledger {
  if (
    !!ledger &&
    typeof ledger === "object" &&
    Array.isArray((ledger as Ledger).entries) &&
    (ledger as Ledger).authoredArcDigest === authoredArcDigest
  ) {
    // Migrate a restored ledger to the current schema: entries saved before the
    // structured consequence record existed are backfilled honestly (grade,
    // contract, and "recorded" only — never invented rewards/party/unlocks), and
    // the ledger version is brought current. New entries pass through untouched.
    return migrateLedger(ledger as Ledger);
  }
  return emptyLedger(authoredArcDigest);
}
