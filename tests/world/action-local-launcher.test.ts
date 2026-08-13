import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8");
}

describe("one-command First Charter action launcher", () => {
  it("derives a real Arc spec and carries it through Unity, Windows, and Quest custody", () => {
    const path = "scripts/run-first-charter-action.ps1";
    expect(existsSync(resolve(ROOT, path))).toBe(true);
    const script = read(path);

    expect(script).toContain("6eef311836ee7cb3a43a94ce51f448a2699c3b04");
    expect(script).toContain("worktree add --detach");
    expect(script).toContain("arc-real-action-spec-adapter.test.ts");
    expect(script).toContain("AXM_REAL_ACTION_SPEC_OUT");
    expect(script).toContain("Remove-Item $adapterDestination");
    expect(script).toContain('Get-GitText $authorityRoot @("status", "--porcelain")');

    expect(script).toContain("project-presentation-manifest.mjs");
    expect(script).toContain("sourceActionSpecDigest");
    expect(script).toContain("run-unity-action-estate-v3.ps1");
    expect(script).toContain("build-unity-action-player.ps1");
    expect(script).toContain("build-unity-action-quest.ps1");

    expect(script).toContain('format = "rodoh-first-charter-action-local-run/1"');
    expect(script).toContain("arcActionAuthorityCommit = $ArcActionAuthority");
    expect(script).toContain("actionSpecDigest = $adapter.actionSpecDigest");
    expect(script).toContain("nativeActionSpecSha256");
    expect(script).toContain("presentationManifestSha256");
    expect(script).toContain("unityEstateReceipt = $v3ReceiptPath");
  });

  it("builds governed local bodies, runtime-bound motion, five enemy kits, and an arena by default", () => {
    const launcher = read("scripts/run-first-charter-action.ps1");
    const baseRunner = read("scripts/run-unity-action-estate.ps1");
    const generator = read("scripts/generate-unity-action-production.ps1");
    const assetBatch = read("unity/Packages/com.axm.rodoh-action/Editor/ActionGovernedProductionBatch.cs");
    const motionBatch = read("unity/Packages/com.axm.rodoh-action/Editor/ActionGovernedMotionAugmentBatch.cs");

    expect(launcher).toContain("[switch]$NeutralPresentation");
    expect(launcher).toContain("GovernedProduction = -not $NeutralPresentation");
    expect(launcher).toContain("governedProductionReceipt");
    expect(baseRunner).toContain("generate-unity-action-production.ps1");
    expect(baseRunner).toContain("governed-production-run.json");
    expect(baseRunner).toContain("authoredPlayerPrefabs -ne 1");
    expect(baseRunner).toContain("authoredEnemyPrefabs -ne 5");
    expect(baseRunner).toContain("neutralFallbackBodies -ne 0");
    expect(baseRunner).toContain("controllers -ne 2");
    expect(baseRunner).toContain("prefabsBound -ne 6");
    expect(baseRunner).toContain("rootMotion -ne $false");
    expect(baseRunner).toContain("actionStateDriven -ne $true");
    expect(generator).toContain("ActionGovernedProductionBatch.Run");
    expect(generator).toContain("ActionGovernedMotionAugmentBatch.Run");
    expect(generator).toContain("bodyPrefabs -ne 6");
    expect(generator).toContain("enemyKits -ne 5");
    expect(generator).toContain("controllers -ne 2");
    expect(generator).toContain("prefabsBound -ne 6");
    expect(generator).toContain("governed-production-run.json");
    expect(assetBatch).toContain("BuildPlayerPrefab");
    expect(assetBatch).toContain("BuildFrogPrefab");
    expect(assetBatch).toContain("BuildMotionKit");
    expect(assetBatch).toContain("BuildArenaPrefab");
    expect(assetBatch).toContain("activePhysicsAuthority = false");
    expect(assetBatch).toContain("remoteRuntimeReferences = false");
    expect(motionBatch).toContain("AnimatorController.CreateAnimatorControllerAtPath");
    expect(motionBatch).toContain('controller.AddParameter("AXM_Mode"');
    expect(motionBatch).toContain("prefabsBound = prefabs");
    expect(motionBatch).toContain("rootMotion = false");
    expect(motionBatch).toContain("proceduralFallbackRetained = true");
    expect(motionBatch).toContain("actionStateDriven = true");
  });

  it("derives physical replay custody from the launcher receipt before journal mutation", () => {
    const path = "scripts/complete-embodied-action-session.ps1";
    expect(existsSync(resolve(ROOT, path))).toBe(true);
    const script = read(path);

    expect(script).toContain("FirstCharterRunReceipt");
    expect(script).toContain("rodoh-first-charter-action-local-run/1");
    expect(script).toContain("arcAuthorityWorktree");
    expect(script).toContain("nativeActionSpecSha256");
    expect(script).toContain('Invoke-GitText $arc @("rev-parse", "HEAD")');
    expect(script).toContain('Invoke-GitText $arc @("status", "--porcelain")');
    expect(script).toContain("rodoh-action-execution-candidate/1");
    expect(script).toContain("Arc replay required");
    expect(script).toContain("candidateValue.actionSpecDigest -ne $specValue.specDigest");
    expect(script).toContain('format = "rodoh-embodied-action-session-completion/1"');
    expect(script).toContain("candidateSha256");
    expect(script).toContain("genesisShard = $shardPath");
  });

  it("does not retain the temporary source-bootstrap workflow", () => {
    expect(existsSync(resolve(ROOT, ".github/workflows/action-source-bootstrap.yml"))).toBe(false);
  });
});
