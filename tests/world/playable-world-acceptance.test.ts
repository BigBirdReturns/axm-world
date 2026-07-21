import { describe, expect, it } from "vitest";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { runCycle, type ChallengeAssignment } from "../../src/engine/cycle.js";
import { compileArcToPlayScene, recommendAgentsForChallenge } from "../../src/play-pipeline/compile.js";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";
import { buildWorldLayout } from "../../src/world/contract.js";
import { appendResult, emptyLedger } from "../../src/world/ledger.js";
import { isWorldInteractionUnlocked } from "../../src/world/proximity.js";
import { loadRun, saveRun, type KVStorage } from "../../src/world/save.js";
import { deriveWorldTransformations } from "../../src/world/world-state.js";
import { buildCustodyObject } from "../../src/world/custody.js";
import { parsePortableRun } from "../../src/engine/portable-run.js";
import { rodohLedgerMemory } from "../../src/world/portable-run.js";

function memoryStorage(): KVStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe("The Cellar — complete playable-world acceptance run", () => {
  it("requires arrival, resolves once, and survives reload as ledger plus transformed place", () => {
    const cartridge = FIRST_CHARTER_CARTRIDGE;
    const arc = cartridge.arc;
    const digest = cartridgeIdentity(cartridge);
    const org = bootstrapOrg(arc);
    const before = compileArcToPlayScene(arc, org);
    const cellarNode = before.nodes.find((node) => node.challengeId === "cellar");
    expect(cellarNode?.status).toBe("available");
    const initialLayout = buildWorldLayout(before);
    const approachDistance = Math.hypot(
      initialLayout.spawn.position[0] - initialLayout.nodes.find((node) => node.challengeId === "cellar")!.position[0],
      initialLayout.spawn.position[1] - initialLayout.nodes.find((node) => node.challengeId === "cellar")!.position[1],
      initialLayout.spawn.position[2] - initialLayout.nodes.find((node) => node.challengeId === "cellar")!.position[2],
    );
    expect(approachDistance).toBeGreaterThan(3);
    expect(approachDistance).toBeLessThan(4);

    // Selection is not authority. The embodied surface grants the interaction
    // only after its proximity sensor reports this exact authored location.
    expect(isWorldInteractionUnlocked("cellar", null)).toBe(false);
    expect(isWorldInteractionUnlocked("cellar", "bridge-troll")).toBe(false);
    expect(isWorldInteractionUnlocked("cellar", "cellar")).toBe(true);

    const cellar = arc.challenges.find((challenge) => challenge.id === "cellar")!;
    const party = recommendAgentsForChallenge(cellar, org, arc).slice(0, cellar.rosterRequirements.maxAgents);
    expect(party).toHaveLength(cellar.rosterRequirements.minAgents);

    const assignment: ChallengeAssignment = { challengeId: "cellar", agentIds: party, tokensSpent: 0 };
    const result = runCycle({ org, arc, assignments: [assignment] });
    const report = result.reports[0]!;
    expect(report.challengeId).toBe("cellar");
    expect(report.outcome).toBe("success");

    const after = compileArcToPlayScene(arc, result.org);
    expect(after.nodes.find((node) => node.challengeId === "cellar")?.status).toBe("cleared");

    const ledger = appendResult(emptyLedger(digest), {
      challengeId: report.challengeId,
      challengeName: cellar.name,
      outcome: report.outcome,
      cycle: report.cycle,
    });
    const storage = memoryStorage();
    saveRun(storage, { arc, authoredArcDigest: digest, state: { org: result.org, ledger } });

    const restored = loadRun(storage, { arc, authoredArcDigest: digest });
    expect(restored).not.toBeNull();
    expect(restored!.ledger.entries).toHaveLength(1);
    expect(restored!.ledger.entries[0]).toMatchObject({ challengeId: "cellar", challengeName: "The Cellar", outcome: "success" });

    const restoredScene = compileArcToPlayScene(arc, restored!.org);
    const restoredLayout = buildWorldLayout(restoredScene);
    expect(restoredLayout.nodes.find((node) => node.challengeId === "cellar")?.status).toBe("cleared");
    expect(deriveWorldTransformations(restoredLayout.nodes, restored!.ledger)).toEqual([
      expect.objectContaining({ challengeId: "cellar", title: "The Cellar", state: "recorded", outcome: "success" }),
    ]);

    const exported = JSON.parse(JSON.stringify(buildCustodyObject({
      cartridge,
      org: restored!.org,
      openingChoice: restored!.openingChoice ?? null,
      nodes: restoredLayout.nodes,
      ledger: restored!.ledger,
    })));
    expect(exported.format).toBe("axm-cartridge-run/v3");
    const portable = parsePortableRun(exported);
    expect(portable.authoredArcDigest).toBe(digest);
    expect(portable.org).toEqual(restored!.org);
    const exportedLedger = rodohLedgerMemory(portable.extensions, digest);
    expect(exportedLedger.entries).toHaveLength(1);
    expect(exportedLedger.entries[0]?.challengeId).toBe("cellar");
    const portableLayout = buildWorldLayout(compileArcToPlayScene(portable.arc, portable.org));
    expect(deriveWorldTransformations(portableLayout.nodes, exportedLedger)).toEqual([
      expect.objectContaining({ challengeId: "cellar", state: "recorded", outcome: "success" }),
    ]);
  });
});
