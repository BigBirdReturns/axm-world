import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const json = (path: string) => JSON.parse(read(path));

describe("UNDERDRAIN player-product acceptance chain", () => {
  it("separates named asset approval from read-only exact representation intake and audit", () => {
    const marker = read("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionProductionAssetMarker.cs");
    const digest = read("unity/Packages/com.axm.rodoh-action/Editor/ActionProductionAssetDigest.cs");
    const approveBatch = read("unity/Packages/com.axm.rodoh-action/Editor/ActionProductionAssetApprovalBatch.cs");
    const intake = read("unity/Packages/com.axm.rodoh-action/Editor/ActionProductionAssetIntakeBatch.cs");
    const audit = read("unity/Packages/com.axm.rodoh-action/Editor/ActionProductionAssetAuditBatch.cs");
    const approve = read("scripts/approve-underdrain-production-assets.ps1");
    const prepare = read("scripts/prepare-underdrain-production-assets.ps1");
    const verify = read("scripts/audit-underdrain-production-assets.ps1");
    const sourceProject = read("unity/Conformance/Axm.Rodoh.Action.AssetCustody.Source.csproj");
    const sourceStubs = read("unity/Conformance/ActionProductionAssetUnityStubs.cs");

    expect(digest).toContain("VisualSourcePaths(GameObject prefab");
    expect(digest).toContain("AssetDatabase.GetDependencies");
    expect(digest).toContain("DependencyRecord");
    expect(digest).toContain("metaSha256");
    expect(digest).toContain("ComputeDeclaredBindingClosure");
    expect(digest).toContain("declaredBindingCount");
    expect(digest).toContain("uniqueDeclaredAssetCount");
    expect(digest).toContain("ProjectFilePath(string assetPath)");
    expect(digest).toContain("Application.dataPath");
    expect(digest).toContain("built-in or untracked primitive visual");
    expect(digest).toContain("forbidden generated primitive custody");
    expect(sourceProject).toContain("ActionProductionAssetApprovalBatch.cs");
    expect(sourceProject).toContain("ActionProductionAssetIntakeBatch.cs");
    expect(sourceProject).toContain("ActionProductionAssetAuditBatch.cs");
    expect(sourceStubs).toContain("namespace UnityEditor");

    expect(marker).toContain('Format = "rodoh-action-production-asset/3"');
    expect(marker).toContain('ApprovalFormat = "rodoh-action-production-asset-approval/2"');
    expect(marker).toContain("visualSourceSha256");
    expect(marker).toContain("dependencyClosureSha256");
    expect(marker).toContain("dependencyCount");
    expect(marker).toContain("approvalRecordFormat");
    expect(marker).toContain("approvalAuthorityId");
    expect(marker).toContain("approvalAttestation");
    expect(marker).toContain("Production asset has not received named approval");

    expect(approveBatch).toContain('ReceiptFormat = "rodoh-action-production-asset-approval/2"');
    expect(approveBatch).toContain("explicit confirmation of all seven assets");
    expect(approveBatch).toContain("ComputePrefabClosure");
    expect(approveBatch).toContain("ComputeDeclaredBindingClosure");
    expect(approveBatch).toContain("prefabMetaSha256");
    expect(approveBatch).toContain("marker.Configure(");
    expect(approveBatch).toContain('authorityAuthentication = "not-performed"');
    expect(approveBatch).toContain('playerProductAcceptance = "not-issued"');
    expect(approve).toContain("ActionProductionAssetApprovalBatch.Run");
    expect(approve).toContain("[switch]$ConfirmAllAssets");
    expect(approve).toContain("27-binding floor");
    expect(approve).toContain("The approval assertion is preserved but not authenticated");

    expect(intake).toContain('ReceiptFormat = "rodoh-action-production-asset-intake/3"');
    expect(intake).toContain("Named production-asset approval receipt is absent");
    expect(intake).toContain("approval.prefabMetaSha256");
    expect(intake).toContain("approval.dependencyClosureSha256");
    expect(intake).toContain("declaredBindingClosureSha256");
    expect(intake).not.toContain("marker.Configure(");
    expect(intake).not.toContain("SaveAsPrefabAsset");
    expect(intake).not.toContain("AssetDatabase.SaveAssets");
    expect(intake).toContain("receipt.assetCount != 7");
    expect(intake).toContain("Authored arena prefab contains no enabled static camera-collision surface");

    expect(audit).toContain('ReceiptFormat = "rodoh-action-production-asset-audit/2"');
    expect(audit).toContain('ApprovalFormat = "rodoh-action-production-asset-approval/2"');
    expect(audit).toContain("GetRequiredArgument(\"-approvalReceipt\")");
    expect(audit).toContain("exactDependencyCustody");
    expect(audit).toContain("exactPrefabCustody");
    expect(audit).toContain("exactBindingCustody");
    expect(audit).toContain("read-only presentation representation provenance and approval-custody audit");
    expect(audit).not.toContain("marker.Configure(");
    expect(audit).not.toContain("SaveAsPrefabAsset");

    expect(prepare).toContain("ActionProductionAssetIntakeBatch.Run");
    expect(prepare).toContain("-approvalReceipt");
    expect(prepare).toContain('format = "rodoh-underdrain-production-asset-intake-run/3"');
    expect(prepare).toContain("exactRepresentationCustody");
    expect(prepare).toContain('playerProductAcceptance = "not-issued"');
    expect(verify).toContain("ActionProductionAssetAuditBatch.Run");
    expect(verify).toContain("-approvalReceipt");
    expect(verify).toContain('format = "rodoh-underdrain-production-asset-audit-run/2"');
    expect(verify).toContain("markerDependencyClosureSha256");
  });

  it("runs named approval, exact representation intake, Arc and Unity production, then leaves explicit review gates open", () => {
    const train = read("scripts/run-underdrain-unity6000-player-product.ps1");
    expect(train).toContain("production-asset-approval.json");
    expect(train).toContain("prepare-underdrain-production-assets.ps1");
    expect(train).toContain("run-underdrain-unity6000-player-train.ps1");
    expect(train).toContain("audit-underdrain-production-assets.ps1");
    expect(train).toContain("AssetApprovalReceipt = $approvalPath");
    expect(train).toContain("visual source changed between intake");
    expect(train).toContain("dependency closure changed after named approval");
    expect(train).toContain("bytes, meta bytes, or GUID changed after named approval");
    expect(train).toContain("27-role representation binding closure changed");
    expect(train).toContain('format = "rodoh-underdrain-unity6000-player-product-train/1"');
    expect(train).toContain("assetApprovalReceiptSha256");
    expect(train).toContain("assetApprovalAuthorityId");
    expect(train).toContain("Read-only production-asset audit lost named approval custody");
    expect(train).toContain("productionAssetSourceDigests");
    expect(train).toContain("exactRepresentationCustody = $true");
    expect(train).toContain('keyboardMouseSession = "open"');
    expect(train).toContain('gamepadSession = "open"');
    expect(train).toContain('roleSeparatedSoftwareReview = "open"');
    expect(train).toContain('physicalHumanEvidence = "separate-open"');
    expect(train).toContain('namedPlayerProductAcceptance = "not-issued"');
    expect(train).not.toContain("GovernedProduction = $true");
  });

  it("retains the canonical narrative contract for separately scoped physical human evidence", () => {
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
  });

  it("publishes a role-separated software-review contract and keeps the legacy human recorder outside software acceptance", () => {
    const contract = json("unity/Fixtures/underdrain.role-separated-software-review.json");
    const review = read("scripts/record-underdrain-role-separated-software-review.ps1");
    const legacy = read("scripts/record-underdrain-independent-comprehension.ps1");
    const accept = read("scripts/accept-underdrain-player-product.ps1");

    expect(contract).toMatchObject({
      format: "rodoh-underdrain-role-separated-review/1",
      reviewReceiptFormat: "rodoh-underdrain-role-separated-review-receipt/1",
      softwareScope: "windows-player-product",
      physicalInstallationScope: "separate",
      independence: {
        minimumDistinctSeats: 3,
        minimumDistinctLineages: 3,
        minimumDistinctContexts: 3,
        artifactMutationAllowed: false,
        runtimeMayIssue: false,
        candidateAuthorMayIssue: false,
      },
    });
    expect(review).toContain("Require-UnderdrainDistinct $seatIds");
    expect(review).toContain("Require-UnderdrainDistinct $lineageIds");
    expect(review).toContain("Require-UnderdrainDistinct $contextDigests");
    expect(review).toContain('runtimeIssued = $false');
    expect(review).toContain('candidateAuthorIssued = $false');
    expect(review).toContain('productAcceptance = "not-issued"');
    expect(legacy).toContain('format = "rodoh-underdrain-independent-comprehension/1"');
    expect(accept).not.toContain('rodoh-underdrain-independent-comprehension/1');
  });

  it("requires separate art approval, exact custody, both device sessions, role-separated review, and a fourth acceptance seat", () => {
    const session = read("scripts/run-underdrain-player-session.ps1");
    const accept = read("scripts/accept-underdrain-player-product.ps1");
    expect(session).toContain('format = "rodoh-underdrain-windows-player-session/2"');
    expect(session).toContain('rodoh-action-player-session-evidence/2');
    expect(session).toContain("playerProductIdentityValid -ne $true");
    expect(session).toContain("session.playerProductId -ne $productRun.productId");
    expect(session).toContain('session.candidateAuthority -ne "Arc replay required"');
    expect(session).toContain("replay-unity-action-candidate.ps1");

    expect(accept).toContain('format = "rodoh-underdrain-player-product-acceptance/2"');
    expect(accept).toContain('scope = "windows-software-player-product"');
    expect(accept).toContain('rodoh-action-production-asset-approval/2');
    expect(accept).toContain("exactRepresentationCustody");
    expect(accept).toContain("declaredBindingClosureSha256");
    expect(accept).toContain("RoleSeparatedReviewReceipt");
    expect(accept).toContain("AcceptanceSeatId");
    expect(accept).toContain("AcceptanceLineageId");
    expect(accept).toContain("AcceptanceContextDigest");
    expect(accept).toContain("Final product-acceptance seat must differ from the presentation-approval seat");
    expect(accept).toContain("Final acceptance seat participated in the role-separated review");
    expect(accept).toContain("Final acceptance lineage participated in the role-separated review");
    expect(accept).toContain("Final acceptance context participated in the role-separated review");
    expect(accept).toContain('rodoh-underdrain-windows-player-session/2');
    expect(accept).toContain("$gamepad.bindingProfileDigest -eq $train.bindingProfileDigest");
    expect(accept).toContain("cameraCollisionAdjustments) -lt 1");
    expect(accept).toContain("voluntarilyContinuedAfterConsequence -ne $true");
    expect(accept).toContain('physicalHumanEvidence = "separate-not-required-for-software-scope"');
    expect(accept).toContain('questAcceptance = "not-issued"');
    expect(accept).toContain('physicalQuestAcceptance = "open"');
  });
});
