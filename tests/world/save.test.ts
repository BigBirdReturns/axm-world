import { describe, it, expect } from "vitest";
import { bootstrapOrg } from "../../src/spoke/bootstrap";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge";
import { emptyLedger, appendResult } from "../../src/world/ledger";
import { saveRun, loadRun, clearRun, SAVE_SCHEMA_VERSION, SAVE_KEY, type KVStorage } from "../../src/world/save";

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
  it("round-trips org + ledger for the same authored program", () => {
    const org = bootstrapOrg(arc);
    const ledger = appendResult(emptyLedger(DIGEST), { challengeId: "c1", challengeName: "One", outcome: "success", cycle: org.cycle });
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org, ledger } });
    const loaded = loadRun(s, { arc, authoredArcDigest: DIGEST });
    expect(loaded).not.toBeNull();
    expect(loaded!.org.cycle).toBe(org.cycle);
    expect(loaded!.ledger.entries).toHaveLength(1);
    expect(loaded!.ledger.entries[0]!.authoredArcDigest).toBe(DIGEST);
  });

  it("ignores a save from a different authored program (digest guard)", () => {
    const org = bootstrapOrg(arc);
    const s = fakeStorage();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org, ledger: emptyLedger(DIGEST) } });
    expect(loadRun(s, { arc, authoredArcDigest: "cart1_other" })).toBeNull();
  });

  it("returns null when there is no save, and after clear", () => {
    const s = fakeStorage();
    expect(loadRun(s, { arc, authoredArcDigest: DIGEST })).toBeNull();
    saveRun(s, { arc, authoredArcDigest: DIGEST, state: { org: bootstrapOrg(arc), ledger: emptyLedger(DIGEST) } });
    clearRun(s);
    expect(loadRun(s, { arc, authoredArcDigest: DIGEST })).toBeNull();
  });

  it("returns null for corrupt data", () => {
    const s = fakeStorage();
    s.setItem(SAVE_KEY, "{not json");
    expect(loadRun(s, { arc, authoredArcDigest: DIGEST })).toBeNull();
  });

  it("uses schema version 1", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(1);
  });
});
