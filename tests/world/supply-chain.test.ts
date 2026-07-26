import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const GENERATE_SBOM = join(ROOT, "scripts/supply-chain/generate-cyclonedx.mjs");
const GENERATE_PROVENANCE = join(ROOT, "scripts/supply-chain/generate-provenance.mjs");
const VERIFY = join(ROOT, "scripts/supply-chain/verify-offline-evidence.mjs");

function run(script: string, args: string[], cwd = ROOT, env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: "utf8" });
}
function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function installFakeGh(bin: string, capture: string): void {
  mkdirSync(bin, { recursive: true });
  if (process.platform === "win32") {
    writeFileSync(join(bin, "gh.cmd"), `@echo off\r\necho %* > "${capture}"\r\nexit /b 0\r\n`);
    return;
  }
  const path = join(bin, "gh");
  writeFileSync(path, `#!/bin/sh\nprintf '%s\\n' "$@" > "$FAKE_GH_ARGS"\nexit 0\n`);
  chmodSync(path, 0o755);
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

  it("verifies complete checksums and binds the World attestation to the World subject", () => {
    const dir = mkdtempSync(join(tmpdir(), "rodoh-evidence-"));
    const artifacts = join(dir, "artifacts");
    const sbomDir = join(dir, "sbom");
    const attestations = join(dir, "attestations");
    mkdirSync(artifacts, { recursive: true });
    mkdirSync(sbomDir, { recursive: true });
    mkdirSync(attestations, { recursive: true });

    const worldArtifact = join(artifacts, "rodoh-world-game.tar.gz");
    const arcArtifact = join(artifacts, "axm-arc-game.tar.gz");
    writeFileSync(worldArtifact, "exact-world-product");
    writeFileSync(arcArtifact, "exact-arc-product");
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
      "--subject", worldArtifact,
      "--subject", arcArtifact,
      "--output", provenance,
      "--repository", "BigBirdReturns/axm-world",
      "--commit", "fedcba9876543210fedcba9876543210fedcba98",
      "--arc-commit", "0123456789abcdef0123456789abcdef01234567",
    ]);
    expect(provenanceResult.status, provenanceResult.stderr).toBe(0);
    const statement = JSON.parse(readFileSync(provenance, "utf8"));
    expect(statement.subject.map((subject: { name: string }) => subject.name)).toEqual([
      "artifacts/axm-arc-game.tar.gz",
      "artifacts/rodoh-world-game.tar.gz",
    ]);

    writeFileSync(join(dir, "SHA256SUMS"), [
      `${sha256(arcArtifact)}  artifacts/axm-arc-game.tar.gz`,
      `${sha256(worldArtifact)}  artifacts/rodoh-world-game.tar.gz`,
      `${sha256(provenance)}  provenance.intoto.json`,
      `${sha256(sbom)}  sbom/axm-world.cdx.json`,
      "",
    ].join("\n"));

    const unsigned = run(VERIFY, ["--root", dir]);
    expect(unsigned.status, unsigned.stderr || unsigned.stdout).toBe(0);
    expect(JSON.parse(unsigned.stdout)).toMatchObject({ status: "pass", filesChecked: 4, provenanceSubjects: 2, sboms: 1 });

    const bundle = join(attestations, "rodoh-world-build-provenance.jsonl");
    const trustedRoot = join(attestations, "trusted_root.jsonl");
    writeFileSync(bundle, "fake-bundle");
    writeFileSync(trustedRoot, "fake-root");
    const bin = join(dir, "bin");
    const capture = join(dir, "gh-args.txt");
    installFakeGh(bin, capture);
    const signed = run(VERIFY, [
      "--root", dir,
      "--bundle", bundle,
      "--trusted-root", trustedRoot,
      "--repo", "BigBirdReturns/axm-world",
      "--attested-subject", "artifacts/rodoh-world-game.tar.gz",
      "--require-signature",
    ], ROOT, { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`, FAKE_GH_ARGS: capture });
    expect(signed.status, signed.stderr || signed.stdout).toBe(0);
    expect(JSON.parse(signed.stdout)).toMatchObject({
      signature: { attempted: true, verified: true, subject: "artifacts/rodoh-world-game.tar.gz" },
    });
    const ghArgs = readFileSync(capture, "utf8");
    expect(ghArgs).toContain(resolve(worldArtifact));
    expect(ghArgs).not.toContain(resolve(arcArtifact));

    writeFileSync(worldArtifact, "tampered-world-product");
    const rejected = run(VERIFY, ["--root", dir]);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("Checksum mismatch");
  });

  it("refuses an attested subject not carried by the provenance statement", () => {
    const dir = mkdtempSync(join(tmpdir(), "rodoh-evidence-subject-"));
    const artifacts = join(dir, "artifacts");
    const attestations = join(dir, "attestations");
    mkdirSync(artifacts, { recursive: true });
    mkdirSync(attestations, { recursive: true });
    const artifact = join(artifacts, "rodoh-world-game.tar.gz");
    writeFileSync(artifact, "exact-static-product");
    const provenance = join(dir, "provenance.intoto.json");
    expect(run(GENERATE_PROVENANCE, ["--subject", artifact, "--output", provenance]).status).toBe(0);
    writeFileSync(join(dir, "SHA256SUMS"), [
      `${sha256(artifact)}  artifacts/rodoh-world-game.tar.gz`,
      `${sha256(provenance)}  provenance.intoto.json`,
      "",
    ].join("\n"));
    const bundle = join(attestations, "bundle.jsonl");
    const trustedRoot = join(attestations, "root.jsonl");
    writeFileSync(bundle, "fake-bundle");
    writeFileSync(trustedRoot, "fake-root");
    const rejected = run(VERIFY, [
      "--root", dir,
      "--bundle", bundle,
      "--trusted-root", trustedRoot,
      "--attested-subject", "artifacts/not-in-statement.tar.gz",
      "--require-signature",
    ]);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("Attested subject is absent from provenance");
  });
});
