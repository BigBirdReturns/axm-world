import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const AUTHOR = resolve(ROOT, "scripts/author-underdrain-production-representation.mjs");
const STAGER = resolve(ROOT, "scripts/stage-underdrain-production-representation.ps1");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const ONE_PIXEL_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4fQAAAAASUVORK5CYII=", "base64");

const roles = [
  "player:rhea-venn",
  "enemy:skirmisher",
  "enemy:duelist",
  "enemy:swarm",
  "enemy:hexer",
  "enemy:breaker",
  "arena:pump-seven",
] as const;

function png(label: string) {
  return Buffer.concat([ONE_PIXEL_PNG, Buffer.from(`underdrain:${label}`, "utf8")]);
}

function writeExtraction(directory: string, sourceCount = 3) {
  const pngRoot = join(directory, "png");
  mkdirSync(pngRoot, { recursive: true });
  const assets = [];
  for (let index = 0; index < sourceCount; index += 1) {
    const bytes = png(`source-${index}`);
    const fileName = `source-${index}.png`;
    writeFileSync(join(pngRoot, fileName), bytes);
    assets.push({
      key: `source-${index}`,
      mime: "image/png",
      width: 1,
      height: 1,
      originalFile: `png/${fileName}`,
      originalSha256: sha256(bytes),
      pngFile: `png/${fileName}`,
      pngSha256: sha256(bytes),
    });
  }
  const sourceSha = "a".repeat(64);
  const receiptPath = join(directory, "shine-extraction.json");
  writeFileSync(receiptPath, `${JSON.stringify({
    format: "rodoh-underdrain-shine-extraction/1",
    status: "pass",
    sourceFile: "UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html",
    sourceFileName: "UNDERDRAIN_The_Bloom_Shine_v0.4.html",
    sourceSha256: sourceSha,
    expectedSourceSha256: sourceSha,
    assetObject: "ASSET_DATA",
    assetCount: assets.length,
    assets,
    unityInvoked: false,
    approvalIssued: false,
    productAcceptance: "not-issued",
  }, null, 2)}\n`);
  return receiptPath;
}

function writeSelection(directory: string, options: { duplicateOutput?: boolean; duplicateRole?: boolean; invalidCrop?: boolean } = {}) {
  const outputBytes = roles.map((role, index) => options.duplicateOutput ? png("same-output") : png(`prepared-${index}-${role}`));
  const selectionPath = join(directory, "authoring-selection.json");
  writeFileSync(selectionPath, `${JSON.stringify({
    format: "rodoh-underdrain-representation-authoring-selection/1",
    operatorId: "source-test-operator",
    roles: roles.map((role, index) => ({
      role: options.duplicateRole && index === 1 ? roles[0] : role,
      sourceKey: `source-${index % 3}`,
      crop: options.invalidCrop
        ? { x: 0, y: 0, width: 2, height: 1 }
        : { x: 0, y: 0, width: 1, height: 1 },
      background: { mode: role === "arena:pump-seven" ? "none" : "edge", tolerance: 48, feather: 18, trim: true },
      output: {
        pngBase64: outputBytes[index]!.toString("base64"),
        width: 1,
        height: 1,
        transparentPixelFraction: role === "arena:pump-seven" ? 0 : 0.5,
      },
    })),
  }, null, 2)}\n`);
  return selectionPath;
}

function runAuthor(extraction: string, selection: string, output: string, replace = false) {
  const args = [
    AUTHOR,
    "--extraction", extraction,
    "--selection", selection,
    "--output", output,
    "--operator-id", "qualified-test-operator",
    "--no-open",
  ];
  if (replace) args.push("--replace");
  return spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
}

describe("UNDERDRAIN local representation authoring", () => {
  it("prepares seven byte-distinct role products from reviewable crops while allowing one project-owned sheet to supply multiple roles", () => {
    const directory = mkdtempSync(join(tmpdir(), "underdrain-authoring-pass-"));
    const extraction = writeExtraction(directory, 3);
    const selection = writeSelection(directory);
    const output = join(directory, "resolved");
    const authored = runAuthor(extraction, selection, output);
    expect(authored.status, authored.stderr || authored.stdout).toBe(0);

    const receipt = JSON.parse(readFileSync(join(output, "representation-authoring-receipt.json"), "utf8"));
    expect(receipt).toMatchObject({
      format: "rodoh-underdrain-representation-authoring/1",
      status: "pass",
      productId: "underdrain-bloom-below-unity6000-v1",
      themeId: "underdrain-bloom-below",
      unityVersion: "6000.0.66f2",
      operatorId: "qualified-test-operator",
      preparedRoleCount: 7,
      distinctPreparedProductCount: 7,
      sourceKeyCount: 3,
      unityInvoked: false,
      representationMaterialized: false,
      approvalIssued: false,
      productAcceptance: "not-issued",
    });
    expect(receipt.roles).toHaveLength(7);
    expect(new Set(receipt.roles.map((entry: { role: string }) => entry.role))).toEqual(new Set(roles));
    expect(new Set(receipt.roles.map((entry: { sourceKey: string }) => entry.sourceKey)).size).toBe(3);
    expect(new Set(receipt.roles.map((entry: { outputSha256: string }) => entry.outputSha256)).size).toBe(7);

    const manifest = JSON.parse(readFileSync(join(output, "resolved-representation-source.json"), "utf8"));
    expect(manifest).toMatchObject({
      format: "rodoh-underdrain-resolved-representation-source/1",
      distinctPreparedProducts: true,
      templateOnly: false,
      reviewRequired: true,
      approvalIssued: false,
      productAcceptance: "not-issued",
    });
    expect(manifest.assets).toHaveLength(7);
    expect(readFileSync(join(output, "SHA256SUMS"), "utf8").trim().split("\n")).toHaveLength(10);

    const retained = runAuthor(extraction, selection, output);
    expect(retained.status).toBe(1);
    expect(retained.stderr).toContain("Output directory is not empty");
    const replaced = runAuthor(extraction, selection, output, true);
    expect(replaced.status, replaced.stderr || replaced.stdout).toBe(0);
  });

  it("refuses duplicate final role bytes, repeated roles, crop escape, and extraction path escape", () => {
    const duplicateDirectory = mkdtempSync(join(tmpdir(), "underdrain-authoring-duplicate-"));
    const duplicateExtraction = writeExtraction(duplicateDirectory, 3);
    const duplicateSelection = writeSelection(duplicateDirectory, { duplicateOutput: true });
    const duplicate = runAuthor(duplicateExtraction, duplicateSelection, join(duplicateDirectory, "output"));
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toContain("may not share prepared PNG bytes");

    const repeatedRoleDirectory = mkdtempSync(join(tmpdir(), "underdrain-authoring-repeated-role-"));
    const repeatedRoleExtraction = writeExtraction(repeatedRoleDirectory, 3);
    const repeatedRoleSelection = writeSelection(repeatedRoleDirectory, { duplicateRole: true });
    const repeatedRole = runAuthor(repeatedRoleExtraction, repeatedRoleSelection, join(repeatedRoleDirectory, "output"));
    expect(repeatedRole.status).toBe(1);
    expect(repeatedRole.stderr).toContain("Selection repeats role");

    const cropDirectory = mkdtempSync(join(tmpdir(), "underdrain-authoring-crop-"));
    const cropExtraction = writeExtraction(cropDirectory, 3);
    const cropSelection = writeSelection(cropDirectory, { invalidCrop: true });
    const crop = runAuthor(cropExtraction, cropSelection, join(cropDirectory, "output"));
    expect(crop.status).toBe(1);
    expect(crop.stderr).toContain("crop escapes source");

    const escapeDirectory = mkdtempSync(join(tmpdir(), "underdrain-authoring-escape-"));
    const escapeExtraction = writeExtraction(escapeDirectory, 3);
    const receipt = JSON.parse(readFileSync(escapeExtraction, "utf8"));
    const outside = join(escapeDirectory, "outside.png");
    const outsideBytes = png("outside");
    writeFileSync(outside, outsideBytes);
    receipt.assets[0].pngFile = "../outside.png";
    receipt.assets[0].pngSha256 = sha256(outsideBytes);
    writeFileSync(escapeExtraction, `${JSON.stringify(receipt, null, 2)}\n`);
    const escaped = runAuthor(escapeExtraction, writeSelection(escapeDirectory), join(escapeDirectory, "output"));
    expect(escaped.status).toBe(1);
    expect(escaped.stderr).toContain("escapes its extraction root");
  });

  it("keeps the browser surface local and binds the one-step Windows stager to exact machine custody and an open named-review boundary", () => {
    const author = read("scripts/author-underdrain-production-representation.mjs");
    const stager = read("scripts/stage-underdrain-production-representation.ps1");
    const authoringDoc = read("docs/UNDERDRAIN_REPRESENTATION_AUTHORING.md");

    expect(author).toContain("127.0.0.1");
    expect(author).toContain("randomBytes(24)");
    expect(author).toContain("x-underdrain-token");
    expect(author).toContain("content-security-policy");
    expect(author).toContain("sourceReuseAllowed: true");
    expect(author).toContain("distinctPreparedBytesRequired: true");
    expect(author).toContain("edgeCutout");
    expect(author).toContain("roleSelectionReviewed: true");
    expect(author).toContain("approvalIssued: false");
    expect(author).toContain("productAcceptance: 'not-issued'");

    expect(stager).toContain("MACHINE_LOCK.json");
    expect(stager).toContain("Resolve-CleanGitCommit");
    expect(stager).toContain("ExpectedWorldCommit");
    expect(stager).toContain("ExpectedArcCommit");
    expect(stager).toContain("AuthoringSelection");
    expect(stager).toContain("& $FilePath @Arguments | Out-Host");
    expect(stager).toContain("baseline-preflight");
    expect(stager).toContain("allowedAssetFailures");
    expect(stager).toContain("materialize-underdrain-production-representation.ps1");
    expect(stager).toContain("postMaterializationPreflight -ne \"pass\"");
    expect(stager).toContain("namedAssetReview = \"open\"");
    expect(stager).toContain("approvalIssued = $false");
    expect(stager).toContain("productAcceptance = \"not-issued\"");

    expect(authoringDoc).toContain("loopback only");
    expect(authoringDoc).toContain("one-step staging runner");
    expect(authoringDoc).toContain("named asset review is open");
    expect(STAGER.endsWith("stage-underdrain-production-representation.ps1")).toBe(true);
  });
});
