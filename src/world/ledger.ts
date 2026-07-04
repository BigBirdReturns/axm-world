// The run ledger -- an append-only log of contract results, each stamped with
// the authored-arc digest of the program it belongs to. This is the "memory +
// proof" surface: every entry proves which authored cartridge produced it, so a
// saved or reloaded ledger can be checked against the program's identity.
//
// Pure and storage-agnostic: no engine, React, or storage imports. Persistence
// lives in save.ts; display lives in the shell.

/** Ledger schema version. Kept in lockstep with PROGRAM_001.ledgerSchemaVersion. */
export const LEDGER_SCHEMA_VERSION = 1;

export type ContractOutcome = "success" | "partial" | "failure";

export interface LedgerEntry {
  /** Authored-arc digest of the program this entry belongs to (cart1_...). The
   *  proof that this result came from a specific authored cartridge. */
  authoredArcDigest: string;
  challengeId: string;
  challengeName: string;
  outcome: ContractOutcome;
  cycle: number;
  /** Monotonic 0-based sequence within the ledger, so entries order without a
   *  wall clock (determinism-friendly; the shell may add timestamps). */
  seq: number;
}

export interface Ledger {
  version: number;
  authoredArcDigest: string;
  entries: LedgerEntry[];
}

export interface ContractResult {
  challengeId: string;
  challengeName: string;
  outcome: ContractOutcome;
  cycle: number;
}

export function emptyLedger(authoredArcDigest: string): Ledger {
  return { version: LEDGER_SCHEMA_VERSION, authoredArcDigest, entries: [] };
}

/** Append a contract result, stamped with the ledger's authoredArcDigest.
 *  Returns a NEW ledger (immutable). Because the digest comes from the ledger,
 *  not the result, every entry proves the same program identity. */
export function appendResult(ledger: Ledger, result: ContractResult): Ledger {
  const entry: LedgerEntry = {
    authoredArcDigest: ledger.authoredArcDigest,
    challengeId: result.challengeId,
    challengeName: result.challengeName,
    outcome: result.outcome,
    cycle: result.cycle,
    seq: ledger.entries.length,
  };
  return { ...ledger, entries: [...ledger.entries, entry] };
}

/** A compact view of what a ledger remembers: how many contracts it recorded and
 *  the most recent result. Pure and shared, so the boot-surface save summary and
 *  the in-shell identity strip derive "N recorded · last contract" identically. */
export interface LedgerSummary {
  entryCount: number;
  lastResult: { challengeName: string; outcome: ContractOutcome } | null;
}

export function summarizeLedger(ledger: Ledger): LedgerSummary {
  const entries = ledger.entries;
  const last = entries.length > 0 ? entries[entries.length - 1]! : null;
  return {
    entryCount: entries.length,
    lastResult: last ? { challengeName: last.challengeName, outcome: last.outcome } : null,
  };
}
