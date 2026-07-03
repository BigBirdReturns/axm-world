// The control question, proven at the logic layer: RODOH loads Program 001,
// completes ONE contract, and sim (result), world-state mutation, ledger, and
// the saved+reloaded run all resolve to the SAME authored cartridge digest.
// This runs in vitest/CI (no React, no browser); the UI receipt is the Playwright
// e2e spec.

import { describe, it, expect } from "vitest";
import { bootstrapOrg } from "../../src/spoke/bootstrap";
import { runCycle, type ChallengeAssignment } from "../../src/engine/cycle";
import { compileArcToPlayScene, recommendAgentsForChallenge } from "../../src/play-pipeline/compile";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge";
import { cartridgeIdentity } from "../../src/world/cartridge-identity";
import { PROGRAM_001 } from "../../src/world/program-of-record";
import { emptyLedger, appendResult } from "../../src/world/ledger";
import { saveRun, loadRun, type KVStorage } from "../../src/world/save";

function fakeStorage(): KVStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

describe("Program 001 -- one playable contract resolves to one authored digest", () => {
  const cartridge = FIRST_CHARTER_CARTRIDGE;
  const arc = cartridge.arc;

  it("threads a single authored-arc digest through sim, ledger, world-state, and save/reload", () => {
    // Identity: the program's digest is the cartridge's authored-arc digest.
    const digest = cartridgeIdentity(cartridge);
    expect(digest).toBe(PROGRAM_001.authoredArcDigest);

    // Load: bootstrap the org from the cartridge's authored arc.
    const org0 = bootstrapOrg(arc);
    const historyBefore = Object.values(org0.agents).reduce((n, a) => n + a.assignmentHistory.length, 0);

    // Choose ONE contract: the first available board node.
    const scene = compileArcToPlayScene(arc, org0);
    const available = scene.nodes.find((n) => n.status === "available");
    expect(available).toBeTruthy();
    const challengeId = available!.challengeId;
    const challenge = arc.challenges.find((c) => c.id === challengeId)!;

    // Commit ONE squad.
    const recommended = recommendAgentsForChallenge(challenge, org0, arc);
    const party = (recommended.length > 0 ? recommended : Object.keys(org0.agents)).slice(
      0,
      challenge.rosterRequirements.maxAgents,
    );
    expect(party.length).toBeGreaterThan(0);

    // Resolve ONE result through the cartridge-driven sim.
    const assignment: ChallengeAssignment = { challengeId, agentIds: party, tokensSpent: 0 };
    const result = runCycle({ org: org0, arc, assignments: [assignment] });
    expect(result.reports.length).toBeGreaterThan(0);
    const report = result.reports[0]!;
    expect(report.challengeId).toBe(challengeId);
    expect(["success", "partial", "failure"]).toContain(report.outcome);

    // Mutate visible world-state: the contract is now recorded on the roster.
    const historyAfter = Object.values(result.org.agents).reduce((n, a) => n + a.assignmentHistory.length, 0);
    expect(historyAfter).toBeGreaterThan(historyBefore);

    // Write ONE ledger entry, stamped with the same digest.
    const ledger = appendResult(emptyLedger(digest), {
      challengeId: report.challengeId,
      challengeName: challenge.name,
      outcome: report.outcome,
      cycle: report.cycle,
    });
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0]!.authoredArcDigest).toBe(digest);

    // Persist and reload -- guarded by the same digest.
    const storage = fakeStorage();
    saveRun(storage, { arc, authoredArcDigest: digest, state: { org: result.org, ledger } });
    const reloaded = loadRun(storage, { arc, authoredArcDigest: digest });
    expect(reloaded).not.toBeNull();
    expect(reloaded!.org.cycle).toBe(result.org.cycle);
    expect(reloaded!.ledger.entries[0]!.authoredArcDigest).toBe(digest);

    // A save from a DIFFERENT authored program is never restored into this one.
    expect(loadRun(storage, { arc, authoredArcDigest: "cart1_not_program_001" })).toBeNull();

    // Everything the loop touched agrees on ONE digest.
    expect(
      new Set([
        digest,
        PROGRAM_001.authoredArcDigest,
        ledger.authoredArcDigest,
        ledger.entries[0]!.authoredArcDigest,
        reloaded!.ledger.authoredArcDigest,
      ]).size,
    ).toBe(1);
  });
});
