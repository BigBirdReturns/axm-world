import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const GENERATE_SBOM = join(ROOT, "scripts/supply-chain/generate-cyclonedx.mjs");
const GENERATE_PROVENANCE = join(ROOT, "scripts/supply-chain/generate-provenance.mjs");
const VERIFY = join(ROOT, "scripts/supply-chain/verify-offline-evidence.mjs");

function run(script: string, args: string[], cwd = ROOT) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
}
function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("release supply-chain evidence", () => {
  it("generates a deterministic CycloneDX 1.7 dependency graph from the lockfile", () => {
    const dir = mkdtempSync(join(tmpdir(), "rodoh-sbom-"));
    const first = join(dir, "first.cdx.json");
    const second = join(dir, "second.cdx.json");
    for (const output of [first, second]) {
      const result = run(GENERATE_SBOM, [
        "--lock", join(ROOT, "package-lock.json"),
        "--package", join(ROOT, "package.json"),
        "--commit", "0123456789abcdef0123456789abcdef01234567",
        "--output", output,
      ]);
      expect(result.status, result.stderr || result.stdout).toBe(0);
    }
    expect(readFileSync(first)).toEqual(readFileSync(second));
    const document = JSON.parse(readFileSync(first, "utf8"));
    expect(document).toMatchObject({ bomFormat: "CycloneDX", specVersion: "1.7", version: 1 });
    expect(document.components.length).toBeGreaterThan(10);
    expect(document.dependencies.length).toBe(document.components.length + 1);
    expect(document.metadata.component.properties).toEqual(expect.arrayContaining([
      { name: "rodoh:source-commit", value: "0123456789abcdef0123456789abcdef01234567" },
    ]));
  });

  it("verifies checksums, CycloneDX documents, and SLSA subjects offline", () => {
    const dir = mkdtempSync(join(tmpdir(), "rodoh-evidence-"));
    const artifacts = join(dir, "artifacts");
    const sbomDir = join(dir, "sbom");
    require("node:fs").mkdirSync(artifacts, { recursive: true });
    require("node:fs").mkdirSync(sbomDir, { recursive: true });
    const artifact = join(artifacts, "rodoh-world-game.tar.gz");
    writeFileSync(artifact, "exact-static-product");
    const sbom = join(sbomDir, "axm-world.cdx.json");
    const sbomResult = run(GENERATE_SBOM, [
      "--lock", join(ROOT, "package-lock.json"),
      "--package", join(ROOT, "package.json"),
      "--commit", "fedcba9876543210fedcba9876543210fedcba98",
      "--output", sbom,
    ]);
    expect(sbomResult.status, sbomResult.stderr).toBe(0);
    const provenance = join(dir, "provenance.intoto.json");
    const provenanceResult = run(GENERATE_PROVENANCE, [
      "--subject", artifact,
      "--output", provenance,
      "--repository", "BigBirdReturns/axm-world",
      "--commit", "fedcba9876543210fedcba9876543210fedcba98",
      "--arc-commit", "0123456789abcdef0123456789abcdef01234567",
    ]);
    expect(provenanceResult.status, provenanceResult.stderr).toBe(0);
    writeFileSync(join(dir, "SHA256SUMS"), [
      `${sha256(artifact)}  artifacts/rodoh-world-game.tar.gz`,
      `${sha256(sbom)}  sbom/axm-world.cdx.json`,
      "",
    ].join("\n"));
    const verify = run(VERIFY, ["--root", dir]);
    expect(verify.status, verify.stderr || verify.stdout).toBe(0);
    expect(JSON.parse(verify.stdout)).toMatchObject({ status: "pass", filesChecked: 2, provenanceSubjects: 1, sboms: 1 });

    writeFileSync(artifact, "tampered-static-product");
    const rejected = run(VERIFY, ["--root", dir]);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("Checksum mismatch");
  });
});
