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

    expect(script).toContain('6eef311836ee7cb3a43a94ce51f448a2699c3b04');
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

  it("does not retain the temporary source-bootstrap workflow", () => {
    expect(existsSync(resolve(ROOT, ".github/workflows/action-source-bootstrap.yml"))).toBe(false);
  });
});
