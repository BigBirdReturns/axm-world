import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const json = (path: string) => JSON.parse(read(path));

describe("UNDERDRAIN player-product acceptance chain", () => {
  it("binds every production prefab to its current imported visual source bytes", () => {
    const digest = read("unity/Packages/com.axm.rodoh-action/Editor/ActionProductionAssetDigest.cs");
    const intake = read("unity/Packages/com.axm.rodoh-action/Editor/ActionProductionAssetIntakeBatch.cs");
    const audit = read("unity/Packages/com.axm.rodoh-action/Editor/ActionProductionAssetAuditBatch.cs");
    const prepare = read("scripts/prepare-underdrain-production-assets.ps1");
    const verify = read("scripts/audit-underdrain-production-assets.ps1");

    expect(digest).toContain("VisualSourcePaths(GameObject prefab");
    expect(digest).toContain("Encoding.UTF8.GetBytes(path + \"\\0\")");
    expect(digest).toContain("ProjectFilePath(string assetPath)");
    expect(digest).toContain("Application.dataPath");
    expect(digest).toContain("built-in or untracked primitive visual");
    expect(digest).toContain("forbidden generated primitive custody");

    expect(intake).toContain('ReceiptFormat = "rodoh-action-production-asset-intake/1"');
    expect(intake).toContain("ActionProductionAssetDigest.Compute");
    expect(intake).toContain("marker.Configure(requirement.assetId, requirement.role, digest, provenance, true, false)");
    expect(intake).toContain("receipt.assetCount != 7");
    expect(intake).toContain("Authored arena prefab contains no enabled static camera-collision surface");

    expect(audit).toContain('ReceiptFormat = "rodoh-action-production-asset-audit/1"');
    expect(audit).toContain("marker.SourceSha256 == computed");
    expect(audit).toContain("read-only presentation asset provenance audit");
    expect(audit).not.toContain("marker.Configure(");
    expect(audit).not.toContain("SaveAsPrefabAsset");

    expect(prepare).toContain("ActionProductionAssetIntakeBatch.Run");
    expect(prepare).toContain('format = "rodoh-underdrain-production-asset-intake-run/1"');
    expect(verify).toContain("ActionProductionAssetAuditBatch.Run");
    expect(verify).toContain('format = "rodoh-underdrain-production-asset-audit-run/1"');
    expect(verify).toContain("markerSourceSha256 -ne $asset.computedSourceSha256");
  });

  it("runs intake, exact Arc and Unity production, then a read-only post-qualification audit", () => {
    const train = read("scripts/run-underdrain-unity6000-player-product.ps1");
    expect(train).toContain("prepare-underdrain-production-assets.ps1");
    expect(train).toContain("run-underdrain-unity6000-player-train.ps1");
    expect(train).toContain("audit-underdrain-production-assets.ps1");
    expect(train).toContain("Production asset $id changed between intake, player-product qualification, and read-only audit");
    expect(train).toContain("Production prefab $id changed after player-product qualification");
    expect(train).toContain('format = "rodoh-underdrain-unity6000-player-product-train/1"');
    expect(train).toContain("productionAssetSourceDigests");
    expect(train).toContain('keyboardMouseSession = "open"');
    expect(train).toContain('namedPlayerProductAcceptance = "not-issued"');
    expect(train).not.toContain("GovernedProduction = $true");
  });

  it("uses canonical Arc narrative identities for independent comprehension", () => {
    const contract = json("unity/Fixtures/underdrain.comprehension-contract.json");
    expect(contract).toMatchObject({
      format: "rodoh-underdrain-comprehension-contract/1",
      productId: "underdrain-bloom-below-unity6000-v1",
      experienceId: "pump-seven-operation",
      challengeId: "breach-crown-pump",
      timingProfileId: "forgiving",
      playerRole: { expectedId: "rhea-venn" },
      nextPlayableAction: { expectedId: "root-gate-parley" },
      humanEvidence: {
        independentRequired: true,
        runtimeMayIssueReceipt: false,
        observerAndAdjudicatorMustDiffer: true,
      },
    });
    expect(contract.authoredChoice.allowedIds).toEqual(["emergency-plan", "service-tunnel", "truce-offer"]);
    expect(contract.learningSequence.map((entry: { phase: string; objectiveId: string }) => [entry.phase, entry.objectiveId])).toEqual([
      ["teach", "diagnose-spore-valves"],
      ["practice", "operate-purge-wheel"],
      ["master", "open-crown-sluice"],
    ]);
    expect(contract.acceptedConsequenceByOutcome.success.expectedId).toBe("fact-pump-seven-balanced");
    expect(contract.acceptedConsequenceByOutcome.partial.expectedId).toBe("fact-pump-seven-ceasefire");
    expect(contract.acceptedConsequenceByOutcome.failure.expectedId).toBe("fact-crown-controls-pump-seven");
  });

  it("keeps comprehension human-issued and bound to an exact accepted physical session", () => {
    const record = read("scripts/record-underdrain-independent-comprehension.ps1");
    expect(record).toContain('format = "rodoh-underdrain-independent-comprehension/1"');
    expect(record).toContain('rodoh-underdrain-unity6000-player-product-train/1');
    expect(record).toContain('rodoh-underdrain-windows-player-session/2');
    expect(record).toContain('axm-action-receipt/1');
    expect(record).toContain("$accepted.result.completedObjectiveIds");
    expect(record).toContain("Independent human evidence requires -Independent");
    expect(record).toContain("The independent player may not inspect source before adjudication");
    expect(record).toContain("Observer and adjudicator must be different people");
    expect(record).toContain("Player could not identify the authored choice they made");
    expect(record).toContain('runtimeIssued = $false');
    expect(record).toContain('productAcceptance = "not-issued"');
  });

  it("requires both device sessions, a real rebind, camera collision, continuation, and all comprehension answers before named acceptance", () => {
    const session = read("scripts/run-underdrain-player-session.ps1");
    const accept = read("scripts/accept-underdrain-player-product.ps1");
    expect(session).toContain('format = "rodoh-underdrain-windows-player-session/2"');
    expect(session).toContain('rodoh-action-player-session-evidence/2');
    expect(session).toContain("playerProductIdentityValid -ne $true");
    expect(session).toContain("session.playerProductId -ne $productRun.productId");
    expect(session).toContain("session.candidateAuthority -ne \"Arc replay required\"");
    expect(session).toContain("replay-unity-action-candidate.ps1");

    expect(accept).toContain('format = "rodoh-underdrain-player-product-acceptance/1"');
    expect(accept).toContain('scope = "windows-player-product"');
    expect(accept).toContain('rodoh-underdrain-windows-player-session/2');
    expect(accept).toContain('rodoh-underdrain-independent-comprehension/1');
    expect(accept).toContain("$gamepad.bindingProfileDigest -eq $train.bindingProfileDigest");
    expect(accept).toContain("cameraCollisionAdjustments) -lt 1");
    expect(accept).toContain("voluntarilyContinuedAfterConsequence -ne $true");
    expect(accept).toContain("observerId -eq $comprehension.observer.adjudicatorId");
    expect(accept).toContain('questAcceptance = "not-issued"');
    expect(accept).toContain('physicalQuestAcceptance = "open"');
  });
});
