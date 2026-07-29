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
        independentComprehensionRequired: true,
        runtimeMayIssueComprehensionReceipt: false,
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

  it("requires exact production markers, imported visuals, static arena collision, and no Unity combat physics", () => {
    const marker = read("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionProductionAssetMarker.cs");
    const identity = read("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionPlayerProductIdentity.cs");
    const batch = read("unity/Packages/com.axm.rodoh-action/Editor/ActionPlayerProductBatch.cs");
    expect(marker).toContain('Format = "rodoh-action-production-asset/1"');
    expect(marker).toContain("productionApproved");
    expect(marker).toContain("generatedPrimitive");
    expect(marker).toContain("Production asset source SHA-256 is absent or malformed");
    expect(identity).toContain('Format = "rodoh-action-player-product-identity/1"');
    expect(identity).toContain('qualification = "source-and-scene-qualified"');
    expect(identity).toContain("runtimeMayIssueComprehensionReceipt = false");
    expect(batch).toMatch(/private\s+(?:sealed\s+)?class\s+AssetRequirement/);
    expect(batch).toContain("EnemyRequirement : AssetRequirement");
    expect(batch).toContain("built-in or untracked primitive visual");
    expect(batch).toContain("forbidden generated primitive custody");
    expect(batch).toContain("Authored arena prefab contains no enabled static camera-collision surface");
    expect(batch).toContain("ActionPlayerProductIdentity");
    expect(batch).toContain("ActionInputBindings");
    expect(batch).toContain("ActionRebindOverlay");
    expect(batch).toContain("ActionPlayerSessionEvidence");
    expect(batch).toContain("ActionPerformanceRecorder");
    expect(batch).toContain("buildEligible = true");
    expect(batch).toContain('productAcceptance = "not-issued"');
  });

  it("makes the Windows build require the qualified serialized player-product identity", () => {
    const batch = read("unity/Packages/com.axm.rodoh-action/Editor/ActionBuildBatch.cs");
    const runner = read("scripts/build-unity-action-player.ps1");
    expect(batch).toContain("-requirePlayerProduct");
    expect(batch).toContain("FindExactlyOne<ActionPlayerProductIdentity>");
    expect(batch).toContain("Player-product identity differs from the exact scene job");
    expect(batch).toContain('comprehensionReceipt = "not-issued-by-build"');
    expect(batch).toContain('productAcceptance = "not-issued-by-build"');
    expect(runner).toContain("[switch]$RequirePlayerProduct");
    expect(runner).toContain('"-requirePlayerProduct"');
    expect(runner).toContain("Built player lost exact player-product identity custody");
    expect(runner).toContain('independentComprehension = "open"');
  });

  it("runs exact Arc generation, authored scene qualification, Windows build, and separate device sessions", () => {
    const train = read("scripts/run-underdrain-unity6000-player-train.ps1");
    const qualifier = read("scripts/qualify-unity-action-player-product.ps1");
    const session = read("scripts/run-underdrain-player-session.ps1");
    expect(train).toContain('$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35"');
    expect(train).toContain("build:action-player-reference");
    expect(train).toContain("build-action-player-spec.ts");
    expect(train).toContain("project-authored-action-presentation.mjs");
    expect(train).toContain("Axm.Rodoh.Action.Cues.csproj");
    expect(train).toContain("run-unity-action-estate-v3.ps1");
    expect(train).toContain("qualify-unity-action-player-product.ps1");
    expect(train).toContain("RequirePlayerProduct = $true");
    expect(train).not.toContain("GovernedProduction = $true");
    expect(train).toContain('keyboardMouseSession = "open"');
    expect(train).toContain('namedPlayerProductAcceptance = "not-issued"');
    expect(qualifier).toContain("ActionPlayerProductBatch.Run");
    expect(qualifier).toContain('presentationAdapterId -ne "production.prefab/v1"');
    expect(session).toContain('[ValidateSet("keyboard-mouse", "gamepad")]');
    expect(session).toContain("-axmActionRequiredDevice");
    expect(session).toContain("-axmActionPerformanceReceipt");
    expect(session).toContain("replay-unity-action-candidate.ps1");
    expect(session).toContain('candidateAuthority -ne "Arc replay required"');
    expect(session).toContain('comprehensionReceipt = "not-issued"');
    expect(session).toContain('namedPlayerProductAcceptance = "not-issued"');
  });
});
