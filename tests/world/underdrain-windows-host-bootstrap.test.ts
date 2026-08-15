import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("UNDERDRAIN Windows host bootstrap", () => {
  it("discovers exact roots without becoming an installer or acceptance authority", () => {
    const source = read("scripts/bootstrap-underdrain-windows-host.ps1");

    expect(source).toContain('format = "rodoh-underdrain-windows-host-bootstrap/1"');
    expect(source).toContain('[switch]$DeepSearch');
    expect(source).toContain('[ValidateRange(1, 12)] [int]$MaxDepth = 6');
    expect(source).toContain("AXM_ESTATE_ROOT");
    expect(source).toContain('Resolve-GitRoot "World"');
    expect(source).toContain('Resolve-GitRoot "ARC"');
    expect(source).toContain("ExpectedWorldTree");
    expect(source).toContain("ExpectedArcTree");
    expect(source).toContain("Unity\\Hub\\Editor\\$ExpectedVersion\\Editor\\Unity.exe");
    expect(source).toContain("rodoh-underdrain-resolved-representation-source/1");
    expect(source).toContain("resolved-representation-source.json");
    expect(source).toContain("distinctPreparedProducts");
    expect(source).toContain("ambiguous");
    expect(source).toContain('repositoriesChanged = $false');
    expect(source).toContain('unityInvoked = $false');
    expect(source).toContain('productAcceptanceIssued = $false');
    expect(source).toContain('questInvoked = $false');
    expect(source).toContain('physicalAcceptanceIssued = $false');

    expect(source).not.toContain("git clone");
    expect(source).not.toContain("git pull");
    expect(source).not.toContain("git checkout");
    expect(source).not.toContain("git reset");
    expect(source).not.toContain("Start-Process");
  });

  it("binds the exact resolved source and emits a placeholder-free materialization command", () => {
    const source = read("scripts/bootstrap-underdrain-windows-host.ps1");

    for (const role of [
      "player:rhea-venn",
      "enemy:skirmisher",
      "enemy:duelist",
      "enemy:swarm",
      "enemy:hexer",
      "enemy:breaker",
      "arena:pump-seven",
    ]) {
      expect(source).toContain(role);
    }
    expect(source).toContain("Get-MaterializationCommand");
    expect(source).toContain("-SourceManifest");
    expect(source).toContain("-SourceRoot");
    expect(source).toContain("-UnityEditor");
    expect(source).toContain("materialize-underdrain-production-representation.ps1");
  });

  it("executes admission, readiness, discovery, dirty, version, ambiguity, and stale-source fixtures", () => {
    const fixture = read("scripts/test-underdrain-windows-host-bootstrap.ps1");

    expect(fixture).toContain('format = "rodoh-underdrain-windows-host-bootstrap-fixture-qualification/1"');
    expect(fixture).toContain('"explicit-open"');
    expect(fixture).toContain('"explicit-ready"');
    expect(fixture).toContain('"bounded-discovery"');
    expect(fixture).toContain('"dirty-world"');
    expect(fixture).toContain('"wrong-unity-project-version"');
    expect(fixture).toContain('"ambiguous-world"');
    expect(fixture).toContain('"stale-resolved-source"');
    expect(fixture).toContain('unityInvoked = $false');
    expect(fixture).toContain('productAcceptanceIssued = $false');
  });

  it("packages a cross-platform source-qualified bootstrap kit", () => {
    const workflow = read(".github/workflows/underdrain-windows-host-bootstrap.yml");

    expect(workflow).toContain("ubuntu-24.04");
    expect(workflow).toContain("windows-2025");
    expect(workflow).toContain("test-underdrain-windows-host-bootstrap.ps1");
    expect(workflow).toContain("underdrain-windows-host-bootstrap-kit");
    expect(workflow).toContain("HOST_BOOTSTRAP_LOCK.json");
    expect(workflow).toContain("RUN_HOST_BOOTSTRAP.ps1");
    expect(workflow).toContain("SHA256SUMS");
    expect(workflow).toContain("targetExecution: 'not-performed'");
  });

  it("documents the receipt, bounded search, status semantics, and non-claims", () => {
    const doc = read("docs/UNDERDRAIN_WINDOWS_HOST_BOOTSTRAP.md");

    expect(doc).toContain("rodoh-underdrain-windows-host-bootstrap/1");
    expect(doc).toContain("breadth-first, depth-limited");
    expect(doc).toContain("A missing object is open. A wrong object is held.");
    expect(doc).toContain("does not install software");
    expect(doc).toContain("representation-materialization");
  });
});
