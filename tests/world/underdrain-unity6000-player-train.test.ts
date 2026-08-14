import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const PROFILE_PATH = resolve(ROOT, "unity/Fixtures/underdrain.player-product.json");
const TEMPLATE_PATH = resolve(ROOT, "unity/Fixtures/underdrain.authored-presentation.template.json");
const PROJECTOR = resolve(ROOT, "unity/Conformance/project-authored-action-presentation.mjs");

const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
const template = JSON.parse(readFileSync(TEMPLATE_PATH, "utf8"));

function syntheticSpec() {
  return {
    format: "axm-action-spec/1",
    specDigest: `actspec1_${"1".repeat(64)}`,
    arcDigest: `cart1_${"2".repeat(64)}`,
    challengeId: "breach-crown-pump",
    timingProfileId: "forgiving",
    arena: { kit: "lane" },
  };
}

function project(templatePath: string) {
  const directory = mkdtempSync(join(tmpdir(), "underdrain-authored-presentation-"));
  const specPath = join(directory, "spec.json");
  const outputPath = join(directory, "presentation.json");
  writeFileSync(specPath, `${JSON.stringify(syntheticSpec(), null, 2)}\n`);
  const result = spawnSync(process.execPath, [PROJECTOR, specPath, templatePath, outputPath, PROFILE_PATH], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return { result, outputPath, directory };
}

describe("UNDERDRAIN Unity 6000 player train", () => {
  it("defines one exact player product without primitive or diagnostic fallbacks", () => {
    expect(profile).toMatchObject({
      format: "rodoh-action-player-product-profile/1",
      productId: "underdrain-bloom-below-unity6000-v1",
      challengeId: "breach-crown-pump",
      timingProfileId: "forgiving",
      themeId: "underdrain-bloom-below",
      presentationAdapterId: "production.prefab/v1",
      allowDiagnosticPresentation: false,
      allowPrimitiveFallback: false,
      input: { keyboardMouse: true, gamepad: true, runtimeRebinding: true },
      camera: { playerFollow: true, collision: true },
      humanEvidence: {
        keyboardMouseSessionRequired: true,
        gamepadSessionRequired: true,
        roleSeparatedSoftwareReviewRequired: true,
        minimumDistinctReviewSeats: 3,
        separateAcceptanceSeatRequired: true,
        independentComprehensionRequired: false,
        runtimeMayIssueComprehensionReceipt: false,
        physicalHumanEvidenceRequiredForSoftwareAcceptance: false,
      },
    });
    expect(profile.enemies).toHaveLength(5);
    expect(new Set(profile.enemies.map((entry: { kit: string }) => entry.kit))).toEqual(
      new Set(["skirmisher", "duelist", "swarm", "hexer", "breaker"]),
    );
    expect(profile.requiredCueIds).toHaveLength(17);
    expect(profile.forbiddenAssetRoots).toEqual(expect.arrayContaining([
      "Assets/AXM/Generated/ActionProduction/GovernedV1",
      "Assets/AXM/Generated/ActionEstate",
    ]));
  });

  it("declares only authored project assets and no generated primitive estate", () => {
    expect(template).toMatchObject({
      format: "rodoh-action-presentation-manifest/1",
      themeId: "underdrain-bloom-below",
      player: { neutralFallback: false },
      arena: { neutralFallback: false },
      provenance: { remoteRuntimeReferencesAllowed: false },
    });
    const paths = [
      template.player.bodyPrefab,
      template.player.animatorController,
      template.arena.recipe,
      ...template.enemies.flatMap((entry: { bodyPrefab: string; animatorController: string }) => [entry.bodyPrefab, entry.animatorController]),
      ...template.feedback.flatMap((entry: { vfxPrefab: string; audioClip: string }) => [entry.vfxPrefab, entry.audioClip]),
      ...template.provenance.assetRoots,
    ];
    for (const path of paths) {
      expect(path).toMatch(/^Assets\/AXM\/Underdrain\/Production(?:\/|$)/);
      expect(path).not.toContain("Assets/AXM/Generated");
    }
    expect(template.enemies.every((entry: { neutralFallback: boolean }) => entry.neutralFallback === false)).toBe(true);
    expect(template.feedback.every((entry: { neutralFallback: boolean }) => entry.neutralFallback === false)).toBe(true);
  });

  it("binds the authored template to exact Arc timing and refuses generated roots", () => {
    const accepted = project(TEMPLATE_PATH);
    expect(accepted.result.status, accepted.result.stderr || accepted.result.stdout).toBe(0);
    const receipt = JSON.parse(accepted.result.stdout);
    const output = JSON.parse(readFileSync(accepted.outputPath, "utf8"));
    expect(receipt).toMatchObject({
      format: "rodoh-authored-action-presentation-projection/1",
      status: "pass",
      sourceSpecDigest: `actspec1_${"1".repeat(64)}`,
      arcDigest: `cart1_${"2".repeat(64)}`,
      challengeId: "breach-crown-pump",
      timingProfileId: "forgiving",
      themeId: "underdrain-bloom-below",
      primitiveFallback: false,
      remoteRuntimeReferences: false,
    });
    expect(output.sourceActionSpecDigest).toBe(`actspec1_${"1".repeat(64)}`);
    expect(output.manifestId).toContain("forgiving");

    const brokenPath = join(accepted.directory, "broken-template.json");
    const broken = structuredClone(template);
    broken.player.bodyPrefab = "Assets/AXM/Generated/ActionEstate/Rhea.prefab";
    writeFileSync(brokenPath, `${JSON.stringify(broken, null, 2)}\n`);
    const refused = project(brokenPath);
    expect(refused.result.status).toBe(1);
    expect(refused.result.stderr).toContain("forbidden generated asset root");
  });

  it("requires exact production markers, dependency closure, static arena collision, and no Unity combat physics", () => {
    const marker = read("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionProductionAssetMarker.cs");
    const digest = read("unity/Packages/com.axm.rodoh-action/Editor/ActionProductionAssetDigest.cs");
    const identity = read("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionPlayerProductIdentity.cs");
    const batch = read("unity/Packages/com.axm.rodoh-action/Editor/ActionPlayerProductBatch.cs");
    expect(marker).toContain('Format = "rodoh-action-production-asset/3"');
    expect(marker).toContain('ApprovalFormat = "rodoh-action-production-asset-approval/2"');
    expect(marker).toContain("dependencyClosureSha256");
    expect(marker).toContain("approvalAuthorityId");
    expect(marker).toContain("generatedPrimitive");
    expect(digest).toContain("AssetDatabase.GetDependencies");
    expect(digest).toContain("ComputeDeclaredBindingClosure");
    expect(digest).toContain("exactly 27 production bindings");
    expect(digest).toContain("exactly 23 unique top-level assets");
    expect(identity).toContain('Format = "rodoh-action-player-product-identity/1"');
    expect(identity).toContain('qualification = "source-and-scene-qualified"');
    expect(identity).toContain("runtimeMayIssueComprehensionReceipt = false");
    expect(batch).toContain("Authored arena prefab contains no enabled static camera-collision surface");
    expect(batch).toContain("ActionPlayerProductIdentity");
    expect(batch).toContain("ActionInputBindings");
    expect(batch).toContain("ActionRebindOverlay");
    expect(batch).toContain("ActionPlayerSessionEvidence");
    expect(batch).toContain("ActionPerformanceRecorder");
    expect(batch).toContain("buildEligible = true");
    expect(batch).toContain('productAcceptance = "not-issued"');
  });

  it("keeps build, device, review, and acceptance authority in separate transactions", () => {
    const buildBatch = read("unity/Packages/com.axm.rodoh-action/Editor/ActionBuildBatch.cs");
    const buildRunner = read("scripts/build-unity-action-player.ps1");
    const train = read("scripts/run-underdrain-unity6000-player-train.ps1");
    const productTrain = read("scripts/run-underdrain-unity6000-player-product.ps1");
    const session = read("scripts/run-underdrain-player-session.ps1");

    expect(buildBatch).toContain("-requirePlayerProduct");
    expect(buildBatch).toContain("FindExactlyOne<ActionPlayerProductIdentity>");
    expect(buildBatch).toContain("Player-product identity differs from the exact scene job");
    expect(buildBatch).toContain('productAcceptance = "not-issued-by-build"');
    expect(buildRunner).toContain("[switch]$RequirePlayerProduct");
    expect(buildRunner).toContain('"-requirePlayerProduct"');
    expect(buildRunner).toContain("Built player lost exact player-product identity custody");

    expect(train).toContain('$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35"');
    expect(train).toContain("build:action-player-reference");
    expect(train).toContain("project-authored-action-presentation.mjs");
    expect(train).toContain("run-unity-action-estate-v3.ps1");
    expect(train).toContain("qualify-unity-action-player-product.ps1");
    expect(train).toContain("RequirePlayerProduct = $true");
    expect(train).not.toContain("GovernedProduction = $true");

    expect(productTrain).toContain('keyboardMouseSession = "open"');
    expect(productTrain).toContain('gamepadSession = "open"');
    expect(productTrain).toContain('roleSeparatedSoftwareReview = "open"');
    expect(productTrain).toContain('physicalHumanEvidence = "separate-open"');
    expect(productTrain).toContain('namedPlayerProductAcceptance = "not-issued"');

    expect(session).toContain('[ValidateSet("keyboard-mouse", "gamepad")]');
    expect(session).toContain("-axmActionRequiredDevice");
    expect(session).toContain("-axmActionPerformanceReceipt");
    expect(session).toContain("replay-unity-action-candidate.ps1");
    expect(session).toContain('candidateAuthority -ne "Arc replay required"');
    expect(session).toContain('namedPlayerProductAcceptance = "not-issued"');
  });

  it("extends the real project train through role-separated review and fourth-seat software acceptance", () => {
    const productTrain = read("scripts/run-underdrain-unity6000-player-product.ps1");
    const approval = read("scripts/approve-underdrain-production-assets.ps1");
    const intake = read("scripts/prepare-underdrain-production-assets.ps1");
    const audit = read("scripts/audit-underdrain-production-assets.ps1");
    const review = read("scripts/record-underdrain-role-separated-software-review.ps1");
    const legacyHuman = read("scripts/record-underdrain-independent-comprehension.ps1");
    const acceptance = read("scripts/accept-underdrain-player-product.ps1");

    expect(productTrain).toContain("AssetApprovalReceipt");
    expect(productTrain).toContain("prepare-underdrain-production-assets.ps1");
    expect(productTrain).toContain("audit-underdrain-production-assets.ps1");
    expect(productTrain).toContain("dependency closure changed after named approval");
    expect(productTrain).toContain("27-role representation binding closure changed");
    expect(productTrain).toContain('format = "rodoh-underdrain-unity6000-player-product-train/1"');
    expect(productTrain).toContain("exactRepresentationCustody = $true");
    expect(approval).toContain("ActionProductionAssetApprovalBatch.Run");
    expect(approval).toContain('rodoh-action-production-asset-approval/2');
    expect(intake).toContain('rodoh-underdrain-production-asset-intake-run/3');
    expect(audit).toContain('rodoh-underdrain-production-asset-audit-run/2');

    expect(review).toContain('format -ne "rodoh-underdrain-role-separated-review/1"');
    expect(review).toContain('runtimeIssued = $false');
    expect(review).toContain('candidateAuthorIssued = $false');
    expect(review).toContain('productAcceptance = "not-issued"');
    expect(legacyHuman).toContain('format = "rodoh-underdrain-independent-comprehension/1"');

    expect(acceptance).toContain('format = "rodoh-underdrain-player-product-acceptance/2"');
    expect(acceptance).toContain('scope = "windows-software-player-product"');
    expect(acceptance).toContain("RoleSeparatedReviewReceipt");
    expect(acceptance).toContain("Gamepad acceptance requires a persisted runtime rebind");
    expect(acceptance).toContain("Final product-acceptance seat must differ from the presentation-approval seat");
    expect(acceptance).toContain("Final acceptance seat participated in the role-separated review");
    expect(acceptance).toContain('physicalHumanEvidence = "separate-not-required-for-software-scope"');
    expect(acceptance).toContain('questAcceptance = "not-issued"');
    expect(acceptance).not.toContain('rodoh-underdrain-independent-comprehension/1');
  });
});
