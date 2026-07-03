import { describe, it, expect } from "vitest";
import { emptyLedger, appendResult, LEDGER_SCHEMA_VERSION } from "../../src/world/ledger";

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
