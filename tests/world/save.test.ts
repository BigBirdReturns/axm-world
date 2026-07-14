import { describe, it, expect } from "vitest";
import { bootstrapOrg } from "../../src/spoke/bootstrap";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge";
import { emptyLedger, appendResult, LEDGER_SCHEMA_VERSION, type Consequence } from "../../src/world/ledger";
import { saveRun, loadRun, clearRun, readProgramSaveSummary, SAVE_SCHEMA_VERSION, saveKeyFor, type KVStorage } from "../../src/world/save";

function fakeStorage(): KVStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

const arc = FIRST_CHARTER_CARTRIDGE.arc;
const DIGEST = "cart1_first";

describe("program run persistence", () => {
  it("round-trips org + ledger + opening choice for the same authored program", () => {
    const org = bootstrapOrg(arc);
    const ledger = appendResult(emptyLedger(DIGEST), { challengeId: "c1", challengeName: "One", outcome: "success", cycle: org.cycle });
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org, ledger, openingChoice: "Hold the line", openingChoiceId: "hold-line" } });
    const loaded = loadRun(s, { arc, authoredArcDigest: DIGEST });
    expect(loaded).not.toBeNull();
    expect(loaded!.org.cycle).toBe(org.cycle);
    expect(loaded!.ledger.entries).toHaveLength(1);
    expect(loaded!.ledger.entries[0]!.authoredArcDigest).toBe(DIGEST);
    // The opening decision label survives reload, so the decision mark is not lost.
    expect(loaded!.openingChoice).toBe("Hold the line");
    expect(loaded!.openingChoiceId).toBe("hold-line");
  });

  it("backfills a consequence for old ledger entries saved before the record existed (#69)", () => {
    const org = bootstrapOrg(arc);
    const ledger = appendResult(emptyLedger(DIGEST), { challengeId: "c1", challengeName: "The Cellar", outcome: "success", cycle: org.cycle });
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org, ledger, openingChoice: null } });

    // Rewrite the stored blob to look like an OLD save: ledger version 1 and entries
    // with NO consequence field (as they were persisted before #69).
    const key = saveKeyFor(DIGEST);
    const stored = JSON.parse(s.getItem(key)!);
    stored.ledger.version = 1;
    for (const e of stored.ledger.entries) delete e.consequence;
    s.setItem(key, JSON.stringify(stored));

    const loaded = loadRun(s, { arc, authoredArcDigest: DIGEST });
    expect(loaded).not.toBeNull();
    expect(loaded!.ledger.entries).toHaveLength(1);
    const c = loaded!.ledger.entries[0]!.consequence;
    // Present and HONEST: grade + contract + recorded, nothing invented.
    expect(c).toBeDefined();
    expect(c.outcome.grade).toBe("cleared");
    expect(c.contract).toEqual({ id: "c1", title: "The Cellar" });
    expect(c.party.members).toEqual([]);
    expect(c.rewards).toEqual([]);
    expect(c.worldChanges).toEqual([{ kind: "recorded", targetId: "c1", label: "The Cellar" }]);
    // The whole ledger is brought to the current schema version on load.
    expect(loaded!.ledger.version).toBe(LEDGER_SCHEMA_VERSION);
  });

  it("round-trips a full structured consequence intact for a new save (#69)", () => {
    const org = bootstrapOrg(arc);
    const rich: Consequence = {
      schemaVersion: 1,
      outcome: { grade: "cleared" },
      contract: { id: "c1", title: "The Cellar" },
      party: { members: [{ id: "a1", name: "Gwenna", role: "Vanguard" }] },
      objectives: [{ id: "o1", label: "Cellar Sweep", status: "cleared" }],
      rewards: [{ kind: "gold", label: "Gold", amount: 125 }],
      worldChanges: [{ kind: "recorded", targetId: "c1", label: "The Cellar" }],
    };
    const ledger = appendResult(emptyLedger(DIGEST), { challengeId: "c1", challengeName: "The Cellar", outcome: "success", cycle: org.cycle, consequence: rich });
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org, ledger } });
    const loaded = loadRun(s, { arc, authoredArcDigest: DIGEST });
    expect(loaded!.ledger.entries[0]!.consequence).toEqual(rich);
  });

  it("defaults opening choice to null when none was persisted", () => {
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org: bootstrapOrg(arc), ledger: emptyLedger(DIGEST) } });
    expect(loadRun(s, { arc, authoredArcDigest: DIGEST })!.openingChoice).toBeNull();
    expect(loadRun(s, { arc, authoredArcDigest: DIGEST })!.openingChoiceId).toBeNull();
  });

  it("ignores a save from a different authored program (digest guard)", () => {
    const org = bootstrapOrg(arc);
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org, ledger: emptyLedger(DIGEST) } });
    expect(loadRun(s, { arc, authoredArcDigest: "cart1_other" })).toBeNull();
  });

  it("keeps a per-program slot: a second program's save never clobbers the first", () => {
    const s = fakeStorage();
    const other = "cart1_second";
    const firstLedger = appendResult(emptyLedger(DIGEST), { challengeId: "c1", challengeName: "One", outcome: "success", cycle: 0 });
    // Play the first program, then a second one saves its own fresh run.
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org: bootstrapOrg(arc), ledger: firstLedger, openingChoice: "First choice" } });
    saveRun(s, { arc, authoredArcDigest: other, state: { org: bootstrapOrg(arc), ledger: emptyLedger(other) } });
    // Returning to the first program still restores its own state, not fresh.
    const first = loadRun(s, { arc, authoredArcDigest: DIGEST });
    expect(first).not.toBeNull();
    expect(first!.ledger.entries).toHaveLength(1);
    expect(first!.openingChoice).toBe("First choice");
    // The two programs occupy distinct storage keys.
    expect(saveKeyFor(DIGEST)).not.toBe(saveKeyFor(other));
  });

  it("returns null when there is no save, and after clear", () => {
    const s = fakeStorage();
    expect(loadRun(s, { arc, authoredArcDigest: DIGEST })).toBeNull();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org: bootstrapOrg(arc), ledger: emptyLedger(DIGEST) } });
    clearRun(s, DIGEST);
    expect(loadRun(s, { arc, authoredArcDigest: DIGEST })).toBeNull();
  });

  it("returns null for corrupt data", () => {
    const s = fakeStorage();
    s.setItem(saveKeyFor(DIGEST), "{not json");
    expect(loadRun(s, { arc, authoredArcDigest: DIGEST })).toBeNull();
  });

  it("uses schema version 1", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(1);
  });
});

describe("readProgramSaveSummary (boot-plaque view)", () => {
  it("returns null when there is no save for this program", () => {
    const s = fakeStorage();
    expect(readProgramSaveSummary(s, { arc, authoredArcDigest: DIGEST })).toBeNull();
  });

  it("summarizes ledger count, the LAST recorded result, and the opening choice", () => {
    const org = bootstrapOrg(arc);
    let ledger = emptyLedger(DIGEST);
    ledger = appendResult(ledger, { challengeId: "c1", challengeName: "The Cellar", outcome: "success", cycle: 0 });
    ledger = appendResult(ledger, { challengeId: "c2", challengeName: "The Vault", outcome: "partial", cycle: 1 });
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org, ledger, openingChoice: "Hold the line" } });

    const summary = readProgramSaveSummary(s, { arc, authoredArcDigest: DIGEST });
    expect(summary).not.toBeNull();
    expect(summary!.ledgerEntryCount).toBe(2);
    // The last result is the most recently appended entry, not the first.
    expect(summary!.lastResult).toEqual({ challengeName: "The Vault", outcome: "partial" });
    expect(summary!.openingChoice).toBe("Hold the line");
  });

  it("reports a resumable save with no recorded contracts yet (fresh ledger)", () => {
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org: bootstrapOrg(arc), ledger: emptyLedger(DIGEST), openingChoice: "Founding" } });
    const summary = readProgramSaveSummary(s, { arc, authoredArcDigest: DIGEST });
    expect(summary).not.toBeNull();
    expect(summary!.ledgerEntryCount).toBe(0);
    expect(summary!.lastResult).toBeNull();
    expect(summary!.openingChoice).toBe("Founding");
  });

  it("returns null for a different authored program (never offers a foreign Resume)", () => {
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org: bootstrapOrg(arc), ledger: emptyLedger(DIGEST) } });
    // A different program's slot is empty, so no summary — the digest-keyed slot
    // guard means one program's save never surfaces as another's resume state.
    expect(readProgramSaveSummary(s, { arc, authoredArcDigest: "cart1_other" })).toBeNull();
  });

  it("returns null for corrupt data (matches loadRun — no phantom Resume)", () => {
    const s = fakeStorage();
    s.setItem(saveKeyFor(DIGEST), "{not json");
    expect(readProgramSaveSummary(s, { arc, authoredArcDigest: DIGEST })).toBeNull();
  });
});
