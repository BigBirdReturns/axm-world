import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const scripts = [
  "scripts/accept-underdrain-player-product.ps1",
  "scripts/audit-underdrain-production-assets.ps1",
  "scripts/build-unity-action-player.ps1",
  "scripts/prepare-underdrain-production-assets.ps1",
  "scripts/qualify-unity-action-player-product.ps1",
  "scripts/record-underdrain-independent-comprehension.ps1",
  "scripts/run-underdrain-player-session.ps1",
  "scripts/run-underdrain-unity6000-player-product.ps1",
  "scripts/run-underdrain-unity6000-player-train.ps1",
];

const parser = String.raw`
$ErrorActionPreference = 'Stop'
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
  $env:AXM_POWERSHELL_SOURCE,
  [ref]$tokens,
  [ref]$errors
) | Out-Null
if (@($errors).Count -gt 0) {
  @($errors) | ForEach-Object {
    [Console]::Error.WriteLine(('{0}:{1}:{2}: {3}' -f $env:AXM_POWERSHELL_SOURCE, $_.Extent.StartLineNumber, $_.Extent.StartColumnNumber, $_.Message))
  }
  exit 1
}
`;

describe("UNDERDRAIN Windows production PowerShell", () => {
  for (const relative of scripts) {
    it(`parses ${relative}`, () => {
      const absolute = resolve(ROOT, relative);
      const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", parser], {
        cwd: ROOT,
        encoding: "utf8",
        env: { ...process.env, AXM_POWERSHELL_SOURCE: absolute },
      });
      expect(result.error, `PowerShell 7 is required to parse ${relative}: ${String(result.error)}`).toBeUndefined();
      expect(result.status, result.stderr || result.stdout).toBe(0);
    });
  }
});
