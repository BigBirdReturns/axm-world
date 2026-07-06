import { describe, it, expect } from "vitest";
import {
  emptyLedger,
  appendResult,
  summarizeLedger,
  minimalConsequence,
  migrateLedger,
  gradeForOutcome,
  LEDGER_SCHEMA_VERSION,
  CONSEQUENCE_SCHEMA_VERSION,
  type Consequence,
  type Ledger,
} from "../../src/world/ledger";

const DIGEST = "cart1_test";

describe("run ledger", () => {
  it("starts empty at the current schema version, stamped with the program digest", () => {
    const l = emptyLedger(DIGEST);
    expect(l.version).toBe(LEDGER_SCHEMA_VERSION);
    expect(l.authoredArcDigest).toBe(DIGEST);
    expect(l.entries).toEqual([]);
  });

  it("stamps every appended entry with the ledger's digest and a monotonic seq", () => {
    let l = emptyLedger(DIGEST);
    l = appendResult(l, { challengeId: "c1", challengeName: "One", outcome: "success", cycle: 1 });
    l = appendResult(l, { challengeId: "c2", challengeName: "Two", outcome: "failure", cycle: 2 });
    expect(l.entries.map((e) => e.seq)).toEqual([0, 1]);
    expect(l.entries.every((e) => e.authoredArcDigest === DIGEST)).toBe(true);
    expect(l.entries[1]!.challengeId).toBe("c2");
    expect(l.entries[1]!.outcome).toBe("failure");
  });

  it("is immutable -- append returns a new ledger and does not mutate the old one", () => {
    const l0 = emptyLedger(DIGEST);
    const l1 = appendResult(l0, { challengeId: "c1", challengeName: "One", outcome: "partial", cycle: 1 });
    expect(l0.entries).toHaveLength(0);
    expect(l1.entries).toHaveLength(1);
    expect(l1).not.toBe(l0);
  });
});

describe("structured consequence record (#69)", () => {
  it("appendResult stamps the honest minimal consequence when the caller omits one", () => {
    let l = emptyLedger(DIGEST);
    l = appendResult(l, { challengeId: "c1", challengeName: "The Cellar", outcome: "success", cycle: 4 });
    const c = l.entries[0]!.consequence;
    expect(c.schemaVersion).toBe(CONSEQUENCE_SCHEMA_VERSION);
    expect(c.outcome.grade).toBe("cleared");
    expect(c.contract).toEqual({ id: "c1", title: "The Cellar" });
    // Minimal ≠ invented: it records the contract + that it was recorded, nothing more.
    expect(c.party.members).toEqual([]);
    expect(c.objectives).toEqual([]);
    expect(c.rewards).toEqual([]);
    expect(c.worldChanges).toEqual([{ kind: "recorded", targetId: "c1", label: "The Cellar" }]);
  });

  it("appendResult preserves a rich consequence the caller supplies", () => {
    const rich: Consequence = {
      schemaVersion: CONSEQUENCE_SCHEMA_VERSION,
      outcome: { grade: "partial" },
      contract: { id: "c2", title: "The Vault" },
      party: { members: [{ id: "a1", name: "Gwenna", role: "Vanguard" }] },
      objectives: [{ id: "o1", label: "Crack it", status: "partial" }],
      rewards: [{ kind: "gold", label: "Gold", amount: 40 }],
      worldChanges: [{ kind: "recorded", targetId: "c2", label: "The Vault" }],
    };
    let l = emptyLedger(DIGEST);
    l = appendResult(l, { challengeId: "c2", challengeName: "The Vault", outcome: "partial", cycle: 5, consequence: rich });
    expect(l.entries[0]!.consequence).toBe(rich);
  });

  it("gradeForOutcome maps engine outcomes to the canonical grade vocabulary", () => {
    expect(gradeForOutcome("success")).toBe("cleared");
    expect(gradeForOutcome("partial")).toBe("partial");
    expect(gradeForOutcome("failure")).toBe("failed");
  });

  it("minimalConsequence claims only what an entry's own fields prove", () => {
    const c = minimalConsequence({ challengeId: "x", challengeName: "The Keep", outcome: "failure" });
    expect(c).toEqual({
      schemaVersion: CONSEQUENCE_SCHEMA_VERSION,
      outcome: { grade: "failed" },
      contract: { id: "x", title: "The Keep" },
      party: { members: [] },
      objectives: [],
      rewards: [],
      worldChanges: [{ kind: "recorded", targetId: "x", label: "The Keep" }],
    });
  });

  it("migrateLedger backfills entries missing a consequence, bumps the version, and is idempotent", () => {
    // A ledger shaped like an OLD save: entries with no consequence, version 1.
    const old = {
      version: 1,
      authoredArcDigest: DIGEST,
      entries: [
        { authoredArcDigest: DIGEST, challengeId: "c1", challengeName: "The Cellar", outcome: "success", cycle: 0 },
        { authoredArcDigest: DIGEST, challengeId: "c2", challengeName: "The Vault", outcome: "failure", cycle: 1 },
      ],
    } as unknown as Ledger;

    const migrated = migrateLedger(old);
    expect(migrated.version).toBe(LEDGER_SCHEMA_VERSION);
    expect(migrated.entries.every((e) => e.consequence !== undefined)).toBe(true);
    // Backfilled honestly from each entry's own fields.
    expect(migrated.entries[0]!.consequence.outcome.grade).toBe("cleared");
    expect(migrated.entries[1]!.consequence.outcome.grade).toBe("failed");
    expect(migrated.entries[1]!.consequence.worldChanges).toEqual([
      { kind: "recorded", targetId: "c2", label: "The Vault" },
    ]);
    // Idempotent + non-destructive: re-migrating keeps the SAME consequence objects.
    const again = migrateLedger(migrated);
    expect(again.entries[0]!.consequence).toBe(migrated.entries[0]!.consequence);
  });
});

describe("summarizeLedger", () => {
  it("reports zero and no last result for an empty ledger", () => {
    expect(summarizeLedger(emptyLedger(DIGEST))).toEqual({ entryCount: 0, lastResult: null });
  });

  it("counts entries and returns the LAST recorded result (name + outcome only)", () => {
    let l = emptyLedger(DIGEST);
    l = appendResult(l, { challengeId: "c1", challengeName: "The Cellar", outcome: "success", cycle: 0 });
    l = appendResult(l, { challengeId: "c2", challengeName: "The Vault", outcome: "partial", cycle: 1 });
    expect(summarizeLedger(l)).toEqual({
      entryCount: 2,
      lastResult: { challengeName: "The Vault", outcome: "partial" },
    });
  });
});
