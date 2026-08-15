import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const source = readFileSync(resolve(ROOT, "scripts/start-underdrain-target-host.ps1"), "utf8");
const fixture = readFileSync(resolve(ROOT, "scripts/test-underdrain-target-host-starter.ps1"), "utf8");
const workflow = readFileSync(resolve(ROOT, ".github/workflows/underdrain-target-host-starter.yml"), "utf8");

describe("UNDERDRAIN target-host starter", () => {
  it("defaults to inspection and requires explicit confirmation for mutation-capable modes", () => {
    expect(source).toContain('[ValidateSet("inspect", "advance", "auto")] [string]$Mode = "inspect"');
    expect(source).toContain("$mutationConfirmationMissing = $Mode -ne \"inspect\" -and -not $ConfirmMutation");
    expect(source).toContain("requires -ConfirmMutation before the commissioning controller may be invoked");
    expect(source).toContain('format = "rodoh-underdrain-target-host-start/1"');
  });

  it("delegates through the established host-bootstrap and commissioning contracts", () => {
    expect(source).toContain('bootstrap-underdrain-windows-host.ps1');
    expect(source).toContain('invoke-underdrain-commissioning.ps1');
    expect(source).toContain('rodoh-underdrain-windows-host-bootstrap/1');
    expect(source).toContain('rodoh-underdrain-windows-commissioning-run/1');
    expect(source).toContain("Commissioning delegation produced $($newRuns.Count) new run receipts; exactly one is required.");
  });

  it("retains the physical and acceptance authority boundary", () => {
    for (const witness of [
      "directUnityAuthority = $false",
      "reviewAuthority = $false",
      "productAcceptanceAuthority = $false",
      "humanOrHouseholdAcceptanceAuthority = $false",
      "questAuthority = $false",
      "physicalAcceptanceAuthority = $false",
      'physicalHumanEvidence = "separate"',
      'questAcceptance = "open"',
      'physicalAcceptance = "not-issued"',
    ]) {
      expect(source).toContain(witness);
    }
    expect(source).not.toContain("Start-Process");
    expect(source).not.toContain("git reset");
    expect(source).not.toContain("git checkout");
    expect(source).not.toContain("git pull");
  });

  it("executes admission and refusal fixtures on Windows and Ubuntu", () => {
    for (const testCase of [
      "inspect-ready",
      "advance-unconfirmed",
      "advance-incomplete",
      "advance-confirmed",
      "advance-dirty-world",
    ]) {
      expect(fixture).toContain(testCase);
    }
    expect(workflow).toContain("ubuntu-24.04");
    expect(workflow).toContain("windows-2025");
    expect(workflow).toContain("underdrain-target-host-starter-fixture-qualification/1");
    expect(workflow).toContain("underdrain-target-host-starter-kit");
  });
});
