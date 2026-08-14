import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("UNDERDRAIN Unity 6000 machine preflight", () => {
  it("retains the exact v1 machine, source, floor, product, and editor boundary", () => {
    const source = read("scripts/preflight-underdrain-unity6000-player-product.ps1");
    expect(source).toContain('$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35"');
    expect(source).toContain('$ExpectedFloorCommit = "9693cb99694338e72c15d0ffbb87b5a1c5bbf16a"');
    expect(source).toContain("actionfloor1_55eb8869417b3b36a28a309263624fe04ad07028f2254337a2f1548cd03b47d8");
    expect(source).toContain("playerintent1_91647652ca3f387b114d5fa7cfab416e2d99c5f307098b6426a17f624cdfbe6c");
    expect(source).toContain('$ExpectedProductId = "underdrain-bloom-below-unity6000-v1"');
    expect(source).toContain('$ExpectedChallengeId = "breach-crown-pump"');
    expect(source).toContain('$ExpectedTimingProfile = "forgiving"');
    expect(source).toContain('$ExpectedPresentationAdapter = "production.prefab/v1"');
    expect(source).toContain('[string]$UnityVersion = "6000.0.66f2"');
    expect(source).toContain('format = "rodoh-underdrain-unity6000-machine-preflight/1"');
  });

  it("adds a v2 wrapper that validates the role-separated review floor without rewriting v1 evidence", () => {
    const source = read("scripts/preflight-underdrain-unity6000-player-product-v2.ps1");
    expect(source).toContain("preflight-underdrain-unity6000-player-product.ps1");
    expect(source).toContain('"-NoFail"');
    expect(source).toContain("legacyReceiptSha256");
    expect(source).toContain('format = "rodoh-underdrain-unity6000-machine-preflight/2"');
    expect(source).toContain('"review.fixture"');
    expect(source).toContain('"review.identity"');
    expect(source).toContain('"review.independence"');
    expect(source).toContain('"review.authority"');
    expect(source).toContain('"profile.review-floor"');
    expect(source).toContain('productAcceptance = "not-issued"');
    expect(source).toContain('physicalHumanEvidence = "separate"');
    expect(source).toContain('questAcceptance = "open"');
    expect(source).toContain("no asset, action, review, human, physical, Quest, or product acceptance authority");
  });

  it("checks the exact machine and filesystem boundary without invoking Unity or approval", () => {
    const source = read("scripts/preflight-underdrain-unity6000-player-product.ps1");
    expect(source).toContain('"world.commit"');
    expect(source).toContain('"world.clean"');
    expect(source).toContain('"arc.commit"');
    expect(source).toContain('"arc.clean"');
    expect(source).toContain('"unity.project-version"');
    expect(source).toContain('"unity.editor"');
    expect(source).toContain('"package.source"');
    expect(source).toContain('"manifest.identity"');
    expect(source).toContain('"profile.refusal"');
    expect(source).toContain('"assets.core-count"');
    expect(source).toContain('"assets.files"');
    expect(source).toContain('"assets.meta"');
    expect(source).toContain('"assets.roots"');
    expect(source).toContain('"assets.extensions"');
    expect(source).toContain("Get-FileHash");
    expect(source).toContain("Read-MetaGuid");
    expect(source).toContain("requires-Unity-intake-and-read-only-audit");
    expect(source).not.toContain("Start-Process");
    expect(source).not.toContain("ActionProductionAssetApprovalBatch.Run");
    expect(source).not.toContain("ActionProductionAssetIntakeBatch.Run");
    expect(source).not.toContain("ActionProductionAssetAuditBatch.Run");
    expect(source).not.toContain("ProductionApproved = true");
  });

  it("executes v1 and v2 pass and refusal fixtures on Windows", () => {
    const legacy = read("scripts/test-underdrain-unity6000-machine-preflight.ps1");
    expect(legacy).toContain('format = "rodoh-underdrain-unity6000-machine-preflight-fixture-qualification/1"');
    expect(legacy).toContain('Name = "pass-complete-fixture"');
    expect(legacy).toContain('Name = "held-missing-core-asset"');
    expect(legacy).toContain('Name = "held-wrong-world-commit"');
    expect(legacy).toContain('Name = "held-forbidden-generated-root"');
    expect(legacy).toContain('productAcceptance = "not-issued"');
    expect(legacy).toContain('unityInvoked = $false');
    expect(legacy).toContain('approvalIssued = $false');

    const current = read("scripts/test-underdrain-unity6000-machine-preflight-v2.ps1");
    expect(current).toContain('format = "rodoh-underdrain-unity6000-machine-preflight-v2-fixture-qualification/1"');
    expect(current).toContain('Name "pass-complete-role-review-floor"');
    expect(current).toContain('Name "held-invalid-role-review-independence"');
    expect(current).toContain('"review.independence"');
    expect(current).toContain('productAcceptance = "not-issued"');
    expect(current).toContain('physicalHumanEvidence = "separate"');
    expect(current).toContain('questInvoked = $false');
    expect(current).toContain('unityInvoked = $false');

    const workflow = read(".github/workflows/underdrain-unity6000-machine-preflight-execution.yml");
    expect(workflow).toContain("runs-on: windows-2025");
    expect(workflow).toContain("test-underdrain-unity6000-machine-preflight-v2.ps1");
    expect(workflow).toContain("underdrain-unity6000-machine-preflight-v2-execution");
  });

  it("gives a cold operator the complete role-separated evidence order and first-divergence procedure", () => {
    const runbook = read("docs/UNDERDRAIN_UNITY6000_MACHINE_RUNBOOK.md");
    expect(runbook).toContain("read-only machine preflight");
    expect(runbook).toContain("named presentation-asset approval");
    expect(runbook).toContain("approval-bound read-only source intake");
    expect(runbook).toContain("read-only post-serialization asset audit");
    expect(runbook).toContain("keyboard and mouse session");
    expect(runbook).toContain("gamepad session with a persisted rebind");
    expect(runbook).toContain("three-seat role-separated software review");
    expect(runbook).toContain("fourth-seat Windows software-product acceptance");
    expect(runbook).toContain("new-underdrain-role-separated-review-kit.ps1");
    expect(runbook).toContain("record-underdrain-role-separated-software-review.ps1");
    expect(runbook).toContain("rodoh-underdrain-player-product-acceptance/2");
    expect(runbook).toContain("Human play, accessibility observation, household use, mounted Quest use");
    expect(runbook).toContain("Do not delete or rewrite a failed receipt");
    expect(runbook).toContain("correct the first divergent plane");
  });
});
