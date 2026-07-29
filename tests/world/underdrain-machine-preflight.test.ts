import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("UNDERDRAIN Unity 6000 machine preflight", () => {
  it("pins the accepted source, floor, product, and editor identities", () => {
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
    expect(source).toContain('"comprehension.identity"');
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

  it("writes fail-visible custody and cannot issue acceptance", () => {
    const source = read("scripts/preflight-underdrain-unity6000-player-product.ps1");
    expect(source).toContain('format = "rodoh-underdrain-unity6000-machine-preflight/1"');
    expect(source).toContain('status = $status');
    expect(source).toContain('machineReadyForNamedAssetReview = $machineReadyForNamedAssetReview');
    expect(source).toContain('productAcceptance = "not-issued"');
    expect(source).toContain("read-only machine and filesystem preflight");
    expect(source).toContain('if ($status -ne "pass" -and -not $NoFail) { exit 2 }');
    expect(source).toContain('($receiptPath + ".sha256")');
    expect(source).toContain("named production-asset review and approval");
    expect(source).toContain("independent player comprehension");
    expect(source).toContain("Quest and physical Quest acceptance");
  });

  it("gives a cold operator the complete evidence order and first-divergence procedure", () => {
    const runbook = read("docs/UNDERDRAIN_UNITY6000_MACHINE_RUNBOOK.md");
    expect(runbook).toContain("read-only machine preflight");
    expect(runbook).toContain("named presentation-asset approval");
    expect(runbook).toContain("approval-bound read-only source intake");
    expect(runbook).toContain("read-only post-serialization asset audit");
    expect(runbook).toContain("keyboard and mouse session");
    expect(runbook).toContain("gamepad session with a persisted rebind");
    expect(runbook).toContain("independent comprehension observation");
    expect(runbook).toContain("separate named Windows player-product acceptance");
    expect(runbook).toContain("The final Windows acceptor must differ from the presentation-asset approver");
    expect(runbook).toContain("Do not delete or rewrite a failed receipt");
    expect(runbook).toContain("correct the first divergent plane");
    expect(runbook).toContain("Quest build, headset operation, tracking, guardian, safety, and physical Quest acceptance remain separate and open");
  });
});