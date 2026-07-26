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
const WORLD_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const ARC_SHA = "0123456789abcdef0123456789abcdef01234567";
const UUID_V5_URN = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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
function writeLedger(dir: string, names: string[]): void {
  writeFileSync(join(dir, "SHA256SUMS"), [
    ...names.sort().map((name) => `${sha256(join(dir, name))}  ${name}`),
    "",
  ].join("\n"));
}
function buildEvidence(): {
  dir: string;
  worldArtifact: string;
  arcArtifact: string;
  worldSbom: string;
  arcSbom: string;
  provenance: string;
  provenanceBundle: string;
  sbomBundle: string;
  trustedRoot: string;
  ledgerNames: string[];
} {
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

  const worldSbom = join(sbomDir, "axm-world.cdx.json");
  const arcSbom = join(sbomDir, "axm-arc.cdx.json");
  expect(run(GENERATE_SBOM, [
    "--lock", join(ROOT, "package-lock.json"),
    "--package", join(ROOT, "package.json"),
    "--commit", WORLD_SHA,
    "--output", worldSbom,
  ]).status).toBe(0);
  expect(run(GENERATE_SBOM, [
    "--lock", join(ROOT, "package-lock.json"),
    "--package", join(ROOT, "package.json"),
    "--commit", ARC_SHA,
    "--output", arcSbom,
  ]).status).toBe(0);

  const provenance = join(dir, "provenance.intoto.json");
  const provenanceResult = run(GENERATE_PROVENANCE, [
    "--subject", worldArtifact,
    "--subject", arcArtifact,
    "--output", provenance,
    "--repository", "BigBirdReturns/axm-world",
    "--commit", WORLD_SHA,
    "--arc-commit", ARC_SHA,
    "--ref", "refs/pull/144/head",
    "--workflow", "BigBirdReturns/axm-world/.github/workflows/supply-chain-evidence.yml@refs/pull/144/head",
    "--invocation", "123-1",
    "--dependency", `git+https://github.com/BigBirdReturns/axm-arc@${ARC_SHA}=${ARC_SHA}`,
  ]);
  expect(provenanceResult.status, provenanceResult.stderr).toBe(0);

  const provenanceBundle = join(attestations, "rodoh-world-build-provenance.jsonl");
  const sbomBundle = join(attestations, "rodoh-world-sbom.jsonl");
  const trustedRoot = join(attestations, "trusted_root.jsonl");
  writeFileSync(provenanceBundle, "fake-provenance-bundle");
  writeFileSync(sbomBundle, "fake-sbom-bundle");
  writeFileSync(trustedRoot, "fake-root");
  const ledgerNames = [
    "artifacts/axm-arc-game.tar.gz",
    "artifacts/rodoh-world-game.tar.gz",
    "attestations/rodoh-world-build-provenance.jsonl",
    "attestations/rodoh-world-sbom.jsonl",
    "attestations/trusted_root.jsonl",
    "provenance.intoto.json",
    "sbom/axm-arc.cdx.json",
    "sbom/axm-world.cdx.json",
  ];
  writeLedger(dir, ledgerNames);
  return { dir, worldArtifact, arcArtifact, worldSbom, arcSbom, provenance, provenanceBundle, sbomBundle, trustedRoot, ledgerNames };
}

function strictArgs(dir: string): string[] {
  return [
    "--root", dir,
    "--require-subject", "artifacts/axm-arc-game.tar.gz",
    "--require-subject", "artifacts/rodoh-world-game.tar.gz",
    "--exact-subjects",
    "--require-sbom", "sbom/axm-arc.cdx.json",
    "--require-sbom", "sbom/axm-world.cdx.json",
    "--exact-sboms",
    "--expected-repository", "BigBirdReturns/axm-world",
    "--world-commit", WORLD_SHA,
    "--arc-commit", ARC_SHA,
    "--expected-workflow", "BigBirdReturns/axm-world/.github/workflows/supply-chain-evidence.yml@refs/pull/144/head",
  ];
}

describe("release supply-chain evidence", () => {
  it("generates deterministic, source-bound CycloneDX 1.7 dependency graphs", () => {
    const dir = mkdtempSync(join(tmpdir(), "rodoh-sbom-"));
    const first = join(dir, "first.cdx.json");
    const second = join(dir, "second.cdx.json");
    const changed = join(dir, "changed.cdx.json");
    for (const output of [first, second]) {
      const result = run(GENERATE_SBOM, [
        "--lock", join(ROOT, "package-lock.json"),
        "--package", join(ROOT, "package.json"),
        "--commit", ARC_SHA,
        "--output", output,
      ]);
      expect(result.status, result.stderr || result.stdout).toBe(0);
    }
    expect(run(GENERATE_SBOM, [
      "--lock", join(ROOT, "package-lock.json"),
      "--package", join(ROOT, "package.json"),
      "--commit", WORLD_SHA,
      "--output", changed,
    ]).status).toBe(0);
    expect(readFileSync(first)).toEqual(readFileSync(second));
    const document = JSON.parse(readFileSync(first, "utf8"));
    const changedDocument = JSON.parse(readFileSync(changed, "utf8"));
    expect(document).toMatchObject({ bomFormat: "CycloneDX", specVersion: "1.7", version: 1 });
    expect(document.serialNumber).toMatch(UUID_V5_URN);
    expect(changedDocument.serialNumber).toMatch(UUID_V5_URN);
    expect(changedDocument.serialNumber).not.toBe(document.serialNumber);
    expect(document.components.length).toBeGreaterThan(10);
    expect(document.dependencies.length).toBe(document.components.length + 1);
    expect(document.metadata.component.properties).toContainEqual({ name: "rodoh:source-commit", value: ARC_SHA });
  });

  it("binds the exact coordinated subjects, SBOMs, commits, workflow, ledger, and offline signatures", () => {
    const evidence = buildEvidence();
    const unsigned = run(VERIFY, strictArgs(evidence.dir));
    expect(unsigned.status, unsigned.stderr || unsigned.stdout).toBe(0);
    expect(JSON.parse(unsigned.stdout)).toMatchObject({
      format: "rodoh-offline-evidence-verification/2",
      status: "pass",
      filesChecked: 8,
      provenanceSubjects: 2,
      sboms: 2,
    });

    const bin = join(evidence.dir, "bin");
    const capture = join(evidence.dir, "gh-args.txt");
    installFakeGh(bin, capture);
    const env = { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`, FAKE_GH_ARGS: capture };
    const signed = run(VERIFY, [
      ...strictArgs(evidence.dir),
      "--bundle", "attestations/rodoh-world-build-provenance.jsonl",
      "--trusted-root", "attestations/trusted_root.jsonl",
      "--repo", "BigBirdReturns/axm-world",
      "--attested-subject", "artifacts/rodoh-world-game.tar.gz",
      "--predicate-type", "https://slsa.dev/provenance/v1",
      "--signer-workflow", "BigBirdReturns/axm-world/.github/workflows/supply-chain-evidence.yml",
      "--source-digest", WORLD_SHA,
      "--source-ref", "refs/heads/main",
      "--require-signature",
    ], ROOT, env);
    expect(signed.status, signed.stderr || signed.stdout).toBe(0);
    expect(JSON.parse(signed.stdout)).toMatchObject({
      signature: {
        attempted: true,
        verified: true,
        subject: "artifacts/rodoh-world-game.tar.gz",
        predicateType: "https://slsa.dev/provenance/v1",
      },
    });
    let ghArgs = readFileSync(capture, "utf8");
    expect(ghArgs).toContain(resolve(evidence.worldArtifact));
    expect(ghArgs).not.toContain(resolve(evidence.arcArtifact));
    expect(ghArgs).toContain("https://slsa.dev/provenance/v1");
    expect(ghArgs).toContain(WORLD_SHA);

    const sbomSigned = run(VERIFY, [
      ...strictArgs(evidence.dir),
      "--bundle", "attestations/rodoh-world-sbom.jsonl",
      "--trusted-root", "attestations/trusted_root.jsonl",
      "--repo", "BigBirdReturns/axm-world",
      "--attested-subject", "artifacts/rodoh-world-game.tar.gz",
      "--predicate-type", "https://cyclonedx.org/bom",
      "--require-signature",
    ], ROOT, env);
    expect(sbomSigned.status, sbomSigned.stderr || sbomSigned.stdout).toBe(0);
    ghArgs = readFileSync(capture, "utf8");
    expect(ghArgs).toContain("https://cyclonedx.org/bom");

    writeFileSync(evidence.worldArtifact, "tampered-world-product");
    const rejected = run(VERIFY, strictArgs(evidence.dir));
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("Checksum mismatch");
  });

  it("refuses duplicate ledger paths and provenance subjects that are not checksummed", () => {
    const evidence = buildEvidence();
    writeFileSync(join(evidence.dir, "SHA256SUMS"), [
      `${sha256(evidence.worldArtifact)}  artifacts/rodoh-world-game.tar.gz`,
      `${sha256(evidence.worldArtifact)}  artifacts/rodoh-world-game.tar.gz`,
      "",
    ].join("\n"));
    const duplicate = run(VERIFY, ["--root", evidence.dir]);
    expect(duplicate.status).not.toBe(0);
    expect(duplicate.stderr).toContain("repeats path");

    writeLedger(evidence.dir, evidence.ledgerNames.filter((name) => name !== "artifacts/axm-arc-game.tar.gz"));
    const missing = run(VERIFY, ["--root", evidence.dir]);
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain("not covered by SHA256SUMS");
  });

  it("refuses evidence paths, subjects, bundles, and trusted roots outside the evidence root", () => {
    const evidence = buildEvidence();
    const outside = join(mkdtempSync(join(tmpdir(), "rodoh-outside-")), "outside.tar.gz");
    writeFileSync(outside, "outside");
    const escapedSubject = run(GENERATE_PROVENANCE, [
      "--subject", outside,
      "--output", evidence.provenance,
      "--commit", WORLD_SHA,
      "--arc-commit", ARC_SHA,
    ]);
    expect(escapedSubject.status).not.toBe(0);
    expect(escapedSubject.stderr).toContain("outside the evidence root");

    const bin = join(evidence.dir, "bin");
    const capture = join(evidence.dir, "gh-args.txt");
    installFakeGh(bin, capture);
    const escapedBundle = run(VERIFY, [
      ...strictArgs(evidence.dir),
      "--bundle", outside,
      "--trusted-root", "attestations/trusted_root.jsonl",
      "--attested-subject", "artifacts/rodoh-world-game.tar.gz",
      "--require-signature",
    ], ROOT, { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`, FAKE_GH_ARGS: capture });
    expect(escapedBundle.status).not.toBe(0);
    expect(escapedBundle.stderr).toContain("escapes evidence root");
  });

  it("refuses identity mismatches and an attested subject absent from provenance", () => {
    const evidence = buildEvidence();
    const wrongCommit = run(VERIFY, [
      ...strictArgs(evidence.dir).map((value) => value === WORLD_SHA ? ARC_SHA : value),
    ]);
    expect(wrongCommit.status).not.toBe(0);
    expect(wrongCommit.stderr).toContain("World commit mismatch");

    const rejected = run(VERIFY, [
      ...strictArgs(evidence.dir),
      "--bundle", "attestations/rodoh-world-build-provenance.jsonl",
      "--trusted-root", "attestations/trusted_root.jsonl",
      "--attested-subject", "artifacts/not-in-statement.tar.gz",
      "--require-signature",
    ]);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("Attested subject is absent from provenance");
  });
});
