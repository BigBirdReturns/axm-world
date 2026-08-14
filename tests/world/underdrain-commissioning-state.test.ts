import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("UNDERDRAIN Windows commissioning state", () => {
  it("models the exact local evidence order without crossing physical or Quest authority", () => {
    const source = read("scripts/get-underdrain-commissioning-state.ps1");

    expect(source).toContain('format = "rodoh-underdrain-windows-commissioning-state/1"');
    expect(source).toContain('$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35"');
    expect(source).toContain('$ExpectedUnityVersion = "6000.0.66f2"');
    expect(source).toContain('"source-custody"');
    expect(source).toContain('"representation-materialization"');
    expect(source).toContain('"machine-preflight-v2"');
    expect(source).toContain('"presentation-asset-approval"');
    expect(source).toContain('"player-product-train"');
    expect(source).toContain('"keyboard-mouse-session"');
    expect(source).toContain('"gamepad-session"');
    expect(source).toContain('"role-review-kit"');
    expect(source).toContain('"role-separated-software-review"');
    expect(source).toContain('"windows-software-product-acceptance"');
    expect(source).toContain("outOfOrderEvidence");
    expect(source).toContain('physicalHumanEvidence = "separate"');
    expect(source).toContain('questAcceptance = "open"');
    expect(source).toContain('physicalAcceptance = "not-issued"');
    expect(source).toContain('authority = "read-only commissioning-state inspection only"');
  });

  it("uses the receipt paths actually emitted by the Windows session runner", () => {
    const state = read("scripts/get-underdrain-commissioning-state.ps1");
    const runner = read("scripts/run-underdrain-player-session.ps1");
    const runbook = read("docs/UNDERDRAIN_UNITY6000_MACHINE_RUNBOOK.md");

    expect(runner).toContain('$sessionRoot = Join-Path $buildReceiptRoot "player-session-$Device"');
    expect(runner).toContain('$sessionRunPath = Join-Path $sessionRoot "session-run.json"');
    expect(state).toContain('build\\receipts\\player-session-keyboard-mouse\\session-run.json');
    expect(state).toContain('build\\receipts\\player-session-gamepad\\session-run.json');
    expect(runbook).toContain('build\\receipts\\player-session-keyboard-mouse\\session-run.json');
    expect(runbook).toContain('build\\receipts\\player-session-gamepad\\session-run.json');
    expect(runbook).toContain("The earlier documentation path under `output\\player-train\\sessions` was incorrect");
    expect(runbook).not.toContain('output\\player-train\\sessions\\keyboard-mouse\\player-session.json');
    expect(runbook).not.toContain('output\\player-train\\sessions\\gamepad\\player-session.json');
  });

  it("provides bounded one-gate progression and blocks missing human decisions", () => {
    const source = read("scripts/invoke-underdrain-commissioning.ps1");

    expect(source).toContain('[ValidateSet("inspect", "advance", "auto")]');
    expect(source).toContain('format = "rodoh-underdrain-windows-commissioning-run/1"');
    expect(source).toContain('Mode = "inspect"');
    expect(source).toContain("SourceManifest and SourceRoot are required");
    expect(source).toContain("Visual review is required");
    expect(source).toContain("Complete the three isolated packet functions");
    expect(source).toContain("Fourth-seat acceptance inputs are missing");
    expect(source).toContain("Preserve it and use a new JobId");
    expect(source).toContain('physicalHumanEvidence = "separate"');
    expect(source).toContain('questAcceptance = "open"');
    expect(source).toContain('physicalAcceptance = "not-issued"');
  });

  it("seals diagnostics without exporting products or source assets", () => {
    const source = read("scripts/export-underdrain-commissioning-evidence.ps1");

    expect(source).toContain('format = "rodoh-underdrain-commissioning-evidence-bundle/1"');
    expect(source).toContain('format = "rodoh-underdrain-commissioning-evidence-bundle-receipt/1"');
    expect(source).toContain('".json", ".sha256", ".txt", ".log", ".md", ".csv"');
    expect(source).toContain('executableIncluded = $false');
    expect(source).toContain('sourceAssetsIncluded = $false');
    expect(source).toContain('productAcceptanceIssued = $false');
    expect(source).toContain('questInvoked = $false');
    expect(source).toContain('physicalAcceptanceIssued = $false');
    expect(source).toContain("SHA256SUMS");
    expect(source).toContain("LATEST_BUNDLE.txt");
  });

  it("executes synthetic open, held, out-of-order, passing, stale, controller, and bundle fixtures", () => {
    const fixture = read("scripts/test-underdrain-commissioning-state.ps1");
    const workflow = read(".github/workflows/underdrain-commissioning-state-source.yml");

    expect(fixture).toContain('format = "rodoh-underdrain-commissioning-state-fixture-qualification/1"');
    expect(fixture).toContain('Invoke-StateCase "open"');
    expect(fixture).toContain('Invoke-StateCase "failed-materialization"');
    expect(fixture).toContain('Invoke-StateCase "out-of-order"');
    expect(fixture).toContain('Invoke-StateCase "complete"');
    expect(fixture).toContain('Invoke-StateCase "stale-acceptance"');
    expect(fixture).toContain("controllerBlockedAdvanceVerified");
    expect(fixture).toContain("diagnosticBundleVerified");
    expect(fixture).toContain('unityInvoked = $false');
    expect(fixture).toContain('productAcceptanceIssued = $false');
    expect(fixture).toContain('questInvoked = $false');

    expect(workflow).toContain("matrix:");
    expect(workflow).toContain("ubuntu-24.04");
    expect(workflow).toContain("windows-2025");
    expect(workflow).toContain("test-underdrain-commissioning-state.ps1");
    expect(workflow).toContain("underdrain-commissioning-state-kit");
    expect(workflow).toContain("MACHINE_BINDING.json");
    expect(workflow).toContain("SHA256SUMS");
  });

  it("documents materialization before preflight for a fresh machine and first-divergence preservation", () => {
    const runbook = read("docs/UNDERDRAIN_UNITY6000_MACHINE_RUNBOOK.md");
    const stateDoc = read("docs/UNDERDRAIN_WINDOWS_COMMISSIONING_STATE.md");

    expect(runbook).toContain("exact representation source");
    expect(runbook).toContain("Unity representation materialization");
    expect(runbook).toContain("read-only machine preflight v2");
    expect(runbook.indexOf("Unity representation materialization")).toBeLessThan(
      runbook.indexOf("read-only machine preflight v2"),
    );
    expect(runbook).toContain("Do not delete or rewrite a failed receipt");
    expect(runbook).toContain("use another `JobId` or review root");
    expect(stateDoc).toContain("A later receipt found after the first non-passing gate");
    expect(stateDoc).toContain("The state controller explicitly blocks those overwrite conditions");
  });
});
