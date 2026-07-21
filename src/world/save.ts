// Program run persistence -- digest-guarded, and one save slot PER authored program.
// A save only ever restores into the SAME authored program: it lives under a key
// namespaced by the program's authored-arc digest, AND loadRun returns null unless
// the stored authoredArcDigest matches (and the engine's arc-id guard also holds).
// Per-program slots mean opening a second cartridge never clobbers the first's saved
// run; the in-payload digest guard is kept as defense-in-depth.
//
// The org is (de)serialized with the engine's own serializeGame/deserializeGame
// (version + arcRef guard + migrations); this module adds the digest guard and
// carries the run ledger, opening choice, and losslessly preserved portable-run
// extensions alongside it.

import type { Arc, Organization } from "../engine/types.js";
import type { PendingRewardChoice } from "../engine/cycle.js";
import { cartridgeDigest } from "../engine/cartridge-digest.js";
import { serializeGame, deserializeGame } from "../engine/save.js";
import {
  normalizePortableRunExtensions,
  type PortableRunExtensions,
} from "../engine/portable-run.js";
import { emptyLedger, migrateLedger, summarizeLedger, type ContractOutcome, type Ledger } from "./ledger.js";
import { storageWriteFailure, type StorageWriteResult } from "./storage-result.js";

/** Save schema version. Kept in lockstep with PROGRAM_001.saveSchemaVersion.
 * Additive fields remain backward-compatible inside version 1. */
export const SAVE_SCHEMA_VERSION = 1;
/** Save-slot key prefix. Each authored program gets its OWN slot, keyed by its
 * authored-arc digest (see saveKeyFor), so playing a second cartridge never
 * overwrites the first program's saved run. */
export const SAVE_KEY_PREFIX = "axm-world:save:v1:";

/** The storage key for a specific authored program's save slot. */
export function saveKeyFor(authoredArcDigest: string): string {
  return `${SAVE_KEY_PREFIX}${authoredArcDigest}`;
}

/** The minimal storage surface this module needs -- localStorage satisfies it
 * structurally, and tests pass a fake. Avoids a hard DOM `Storage` dependency. */
export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProgramRunState {
  org: Organization;
  ledger: Ledger;
  /** Unclaimed engine-authored rewards are durable run state. Losing them on
   * reload would preserve the receipt while deleting its unresolved choice. */
  pendingRewardChoices?: PendingRewardChoice[];
  /** The opening decision label the player chose, persisted so the visible decision
   * mark (and the export) survive a reload. */
  openingChoice?: string | null;
  /** Stable authored option id. Additive so old v1 saves continue to load. */
  openingChoiceId?: string | null;
  /** Holder-owned runtime memory imported from or destined for portable run v3.
   * Unknown namespaces are preserved byte-semantically even when World cannot
   * render them. */
  extensions?: PortableRunExtensions;
}

interface StoredSave {
  version: number;
  authoredArcDigest: string;
  /** Engine serializeGame(org, arc) output. */
  game: string;
  ledger: Ledger;
  openingChoice: string | null;
  openingChoiceId?: string | null;
  extensions?: PortableRunExtensions;
}

/** Persist a program's run state under its own authored-arc-digest slot. */
export function saveRun(
  storage: KVStorage,
  params: { arc: Arc; authoredArcDigest: string; state: ProgramRunState },
): StorageWriteResult {
  const actualDigest = cartridgeDigest(params.arc);
  if (actualDigest !== params.authoredArcDigest) {
    throw new Error(`Refusing to save Arc ${params.arc.meta.id} under foreign authored identity ${params.authoredArcDigest}.`);
  }
  if (!ledgerMatchesAuthoredDigest(params.state.ledger, params.authoredArcDigest)) {
    throw new Error("Refusing to save a ledger under a different authored identity.");
  }
  const stored: StoredSave = {
    version: SAVE_SCHEMA_VERSION,
    authoredArcDigest: params.authoredArcDigest,
    game: serializeGame(params.state.org, params.arc, params.state.pendingRewardChoices ?? []),
    ledger: params.state.ledger,
    openingChoice: params.state.openingChoice ?? null,
    openingChoiceId: params.state.openingChoiceId ?? null,
    extensions: normalizePortableRunExtensions(params.state.extensions ?? {}),
  };
  try {
    storage.setItem(saveKeyFor(params.authoredArcDigest), JSON.stringify(stored));
    return { ok: true };
  } catch (error) {
    return storageWriteFailure(error, "Saving the run");
  }
}

/** Load a program's run state IF the stored save matches this program's authored
 * identity (digest guard) and arc. Returns null when there is no save, when the
 * save belongs to a different authored program, or when it is unreadable. */
export function loadRun(
  storage: KVStorage,
  params: { arc: Arc; authoredArcDigest: string },
): ProgramRunState | null {
  if (cartridgeDigest(params.arc) !== params.authoredArcDigest) return null;
  const raw = storage.getItem(saveKeyFor(params.authoredArcDigest));
  if (!raw) return null;
  let parsed: Partial<StoredSave>;
  try {
    parsed = JSON.parse(raw) as Partial<StoredSave>;
  } catch {
    return null;
  }
  if (parsed.version !== SAVE_SCHEMA_VERSION) return null;
  if (parsed.authoredArcDigest !== params.authoredArcDigest) return null;
  if (typeof parsed.game !== "string") return null;
  if (!ledgerMatchesAuthoredDigest(parsed.ledger, params.authoredArcDigest)) return null;
  let org: Organization;
  let pendingRewardChoices: PendingRewardChoice[];
  try {
    ({ org, pendingRewardChoices } = deserializeGame(parsed.game, params.arc));
  } catch {
    return null;
  }
  let extensions: PortableRunExtensions;
  try {
    extensions = normalizePortableRunExtensions(parsed.extensions ?? {});
  } catch {
    return null;
  }
  return {
    org,
    ledger: normalizeLedger(parsed.ledger, params.authoredArcDigest),
    pendingRewardChoices,
    openingChoice: typeof parsed.openingChoice === "string" ? parsed.openingChoice : null,
    openingChoiceId: typeof parsed.openingChoiceId === "string" ? parsed.openingChoiceId : null,
    extensions,
  };
}

export function clearRun(storage: KVStorage, authoredArcDigest: string): StorageWriteResult {
  try {
    storage.removeItem(saveKeyFor(authoredArcDigest));
    return { ok: true };
  } catch (error) {
    return storageWriteFailure(error, "Clearing the run");
  }
}

/** A read-only, boot-surface view of a program's save slot. */
export interface ProgramSaveSummary {
  authoredArcDigest: string;
  ledgerEntryCount: number;
  lastResult: { challengeName: string; outcome: ContractOutcome } | null;
  openingChoice: string | null;
}

export interface LegacyProgramSaveSummary {
  authoredArcDigest: string;
  ledgerEntryCount: number;
  lastResult: { challengeName: string; outcome: ContractOutcome } | null;
  status: "legacy-profile-unavailable";
}

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

/** Inspect an old digest-keyed slot without deserializing it against or
 * relabeling it as the current Arc. This is intentionally summary-only until an
 * exact frozen legacy execution profile exists. */
export function readLegacyProgramSaveSummary(
  storage: KVStorage,
  authoredArcDigest: string,
): LegacyProgramSaveSummary | null {
  const raw = storage.getItem(saveKeyFor(authoredArcDigest));
  if (!raw) return null;
  let parsed: Partial<StoredSave>;
  try {
    parsed = JSON.parse(raw) as Partial<StoredSave>;
  } catch {
    return null;
  }
  if (parsed.version !== SAVE_SCHEMA_VERSION) return null;
  if (parsed.authoredArcDigest !== authoredArcDigest) return null;
  if (typeof parsed.game !== "string") return null;
  const ledger = parsed.ledger as Partial<Ledger> | undefined;
  if (!ledger || ledger.authoredArcDigest !== authoredArcDigest || !Array.isArray(ledger.entries)) return null;
  if (!ledger.entries.every((entry) =>
    !!entry
    && entry.authoredArcDigest === authoredArcDigest
    && typeof entry.challengeName === "string"
    && (entry.outcome === "success" || entry.outcome === "partial" || entry.outcome === "failure"))) {
    return null;
  }
  const summary = summarizeLedger(ledger as Ledger);
  return {
    authoredArcDigest,
    ledgerEntryCount: summary.entryCount,
    lastResult: summary.lastResult,
    status: "legacy-profile-unavailable",
  };
}

export function normalizeLedgerForDigest(ledger: unknown, authoredArcDigest: string): Ledger {
  return normalizeLedger(ledger, authoredArcDigest);
}

export function ledgerMatchesDigest(ledger: unknown, authoredArcDigest: string): ledger is Ledger {
  return ledgerMatchesAuthoredDigest(ledger, authoredArcDigest);
}

function normalizeLedger(ledger: unknown, authoredArcDigest: string): Ledger {
  if (
    !!ledger &&
    typeof ledger === "object" &&
    Array.isArray((ledger as Ledger).entries) &&
    (ledger as Ledger).authoredArcDigest === authoredArcDigest
  ) {
    return migrateLedger(ledger as Ledger);
  }
  return emptyLedger(authoredArcDigest);
}

function ledgerMatchesAuthoredDigest(ledger: unknown, authoredArcDigest: string): ledger is Ledger {
  if (!ledger || typeof ledger !== "object") return false;
  const candidate = ledger as Partial<Ledger>;
  return candidate.authoredArcDigest === authoredArcDigest
    && Array.isArray(candidate.entries)
    && candidate.entries.every((entry) => !!entry && entry.authoredArcDigest === authoredArcDigest);
}
