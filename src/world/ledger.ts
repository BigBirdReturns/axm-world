// The run ledger -- an append-only log of contract results, each stamped with
// the authored-arc digest of the program it belongs to. This is the "memory +
// proof" surface: every entry proves which authored cartridge produced it, so a
// saved or reloaded ledger can be checked against the program's identity.
//
// Pure and storage-agnostic: no engine, React, or storage imports. Persistence
// lives in save.ts; display lives in the shell.

/** Ledger schema version. Kept in lockstep with PROGRAM_001.ledgerSchemaVersion
 *  (enforced by tests/world/ledger-schema-lockstep.test.ts). Bumped to 2 when the
 *  structured consequence record (below) was added to every entry. */
export const LEDGER_SCHEMA_VERSION = 2;

/** Version of the structured consequence record shape (LedgerEntry.consequence).
 *  Independent of the ledger schema version — the consequence object carries its
 *  own schemaVersion so a reader can tell which facts to expect. */
export const CONSEQUENCE_SCHEMA_VERSION = 1;

export type ContractOutcome = "success" | "partial" | "failure";

/** The outcome grade, in the canonical Cleared / Partial / Failed vocabulary the
 *  result overlay, receipt, revisit modal, and ledger already speak (see #65).
 *  This is what the durable consequence record stores — never the engine's
 *  internal "success/partial/failure" and never an S/A/D grade. */
export type ConsequenceGrade = "cleared" | "partial" | "failed";

const GRADE_FOR_OUTCOME: Record<ContractOutcome, ConsequenceGrade> = {
  success: "cleared",
  partial: "partial",
  failure: "failed",
};

/** Map an engine outcome to the canonical grade vocabulary. */
export function gradeForOutcome(outcome: ContractOutcome): ConsequenceGrade {
  return GRADE_FOR_OUTCOME[outcome];
}

/** A single reward the run actually granted. `kind` is the fact; `label` is a
 *  display name; `amount` is present only for countable rewards. */
export interface ConsequenceReward {
  kind: "reputation" | "gold" | "supply" | "item" | "other";
  label: string;
  amount?: number;
}

/** A single world-state change the run actually produced. `recorded` (the
 *  contract entered program memory) is honestly known for every resolved run;
 *  `unlocked` / `flag_changed` / `state_changed` only when the engine/arc says so. */
export interface ConsequenceWorldChange {
  kind: "recorded" | "unlocked" | "flag_changed" | "state_changed";
  targetId: string;
  label: string;
}

/**
 * The structured, durable record of a resolved run — the truth the runtime can
 * honestly know at resolution time. Stored on the ledger entry that proves the
 * run happened (one resolved run → one entry → one consequence). Structured
 * FACTS only: prose is generated from these downstream, never stored here.
 *
 * NOTE: distinct from the engine's `MechanicCheck.failureConsequence` (a per-check
 * failure hazard). This is the run-level record of what a resolution produced.
 */
export interface Consequence {
  schemaVersion: number;
  outcome: { grade: ConsequenceGrade };
  contract: { id: string; title: string };
  party: { members: Array<{ id: string; name: string; role?: string }> };
  objectives: Array<{ id: string; label: string; status: ConsequenceGrade }>;
  rewards: ConsequenceReward[];
  worldChanges: ConsequenceWorldChange[];
}

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
  /** The structured, durable consequence record for this resolved run. Always
   *  present: built at resolution for new entries, honestly backfilled for old
   *  ones on load (migrateLedger). */
  consequence: Consequence;
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
  /** The structured consequence, built by the caller from the run report at
   *  resolution time (see src/world/consequence.ts). Optional: when omitted,
   *  appendResult stamps the honest minimal record derivable from the fields
   *  above — so an entry ALWAYS carries a consequence. */
  consequence?: Consequence;
}

export function emptyLedger(authoredArcDigest: string): Ledger {
  return { version: LEDGER_SCHEMA_VERSION, authoredArcDigest, entries: [] };
}

/** The minimal, HONEST consequence recoverable from an entry's top-level fields
 *  alone — used to backfill entries saved before the consequence record existed.
 *  It claims only what those fields prove: the grade, the contract, and that the
 *  contract was recorded. It never invents party, objectives, rewards, or unlocks. */
export function minimalConsequence(source: Pick<LedgerEntry, "challengeId" | "challengeName" | "outcome">): Consequence {
  return {
    schemaVersion: CONSEQUENCE_SCHEMA_VERSION,
    outcome: { grade: gradeForOutcome(source.outcome) },
    contract: { id: source.challengeId, title: source.challengeName },
    party: { members: [] },
    objectives: [],
    rewards: [],
    worldChanges: [{ kind: "recorded", targetId: source.challengeId, label: source.challengeName }],
  };
}

/** Bring a (possibly old) ledger up to the current schema: every entry gets a
 *  consequence (backfilled honestly if missing), and the ledger version is set to
 *  current. Idempotent — entries that already carry a consequence are untouched. */
export function migrateLedger(ledger: Ledger): Ledger {
  const entries = ledger.entries.map((entry) =>
    entry.consequence ? entry : { ...entry, consequence: minimalConsequence(entry) },
  );
  return { ...ledger, version: LEDGER_SCHEMA_VERSION, entries };
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
    consequence: result.consequence ?? minimalConsequence(result),
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
