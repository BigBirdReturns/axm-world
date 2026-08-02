import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  verifyBurnExternalAssetSet,
  type CurrentCartridgeIdentity,
  type HolderAssetFile,
} from "../../src/world/external-assets.js";

const FIXTURE_DIR = process.env["BURN_PROTOCOL_HOLDER_ASSET_FIXTURE_DIR"];
const TAMPER_DIR = process.env["BURN_PROTOCOL_HOLDER_ASSET_TAMPER_DIR"];

function mimeFor(filePath: string): string {
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

function loadFiles(root: string): HolderAssetFile[] {
  const files: HolderAssetFile[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        const bytes = readFileSync(absolute);
        const relativePath = path.relative(root, absolute).split(path.sep).join("/");
        files.push({
          name: entry.name,
          relativePath,
          size: statSync(absolute).size,
          type: mimeFor(relativePath),
          blob: new Blob([bytes], { type: mimeFor(relativePath) }),
        });
      }
    }
  };
  visit(root);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function currentIdentity(root: string): CurrentCartridgeIdentity {
  const contract = JSON.parse(readFileSync(path.join(root, "holder-fixture.activation.json"), "utf8")) as {
    publication: {
      cartridgeId: string;
      version: string;
      engineVersion: string;
      cartridgeDigest: string;
      sourcePlane: string;
      exactParentSha256: string;
    };
  };
  return {
    id: contract.publication.cartridgeId,
    version: contract.publication.version,
    engineVersion: contract.publication.engineVersion,
    authoredArcDigest: contract.publication.cartridgeDigest,
    sourcePlane: contract.publication.sourcePlane,
    exactParentSha256: contract.publication.exactParentSha256,
  };
}

describe.skipIf(!FIXTURE_DIR || !TAMPER_DIR)("Burn Protocol holder-controlled external assets", () => {
  it("binds a selected local asset to the complete activation chain without changing authored authority", async () => {
    const verified = await verifyBurnExternalAssetSet(loadFiles(FIXTURE_DIR!), currentIdentity(FIXTURE_DIR!));
    expect(verified).toMatchObject({
      format: "burn-protocol-holder-asset-session/1",
      evidenceTier: "mechanism-fixture",
      classification: "mechanism-fixture-external-custody",
      indexedAssets: 1,
      missingAssets: 0,
      authority: {
        inheritedHistory: "read-only",
        liveRuns: "counterfactual-only",
        storyChanges: "none",
        authoredPanels: "not-present",
        runtimeBundling: "none",
      },
    });
    expect(verified.verifiedAssets).toHaveLength(1);
    expect(verified.verifiedAssets[0]).toMatchObject({
      path: "assets/E12-C3-P01.svg",
      classification: "panel-raster",
    });
  });

  it("refuses asset bytes changed after the index and approval were issued", async () => {
    await expect(
      verifyBurnExternalAssetSet(loadFiles(TAMPER_DIR!), currentIdentity(FIXTURE_DIR!)),
    ).rejects.toThrow(/Asset assets\/E12-C3-P01\.svg bytes|SHA-256/);
  });

  it("refuses a custody overlay bound to another authored cartridge identity", async () => {
    const current = currentIdentity(FIXTURE_DIR!);
    await expect(
      verifyBurnExternalAssetSet(loadFiles(FIXTURE_DIR!), {
        ...current,
        authoredArcDigest: `cart1_${"0".repeat(64)}`,
      }),
    ).rejects.toThrow(/Activation cartridge digest/);
  });

  it("refuses an asset index changed after the approval was issued", async () => {
    const files = loadFiles(FIXTURE_DIR!);
    const indexPosition = files.findIndex((file) => file.name === "corpus-asset-index.json");
    const original = JSON.parse(await files[indexPosition]!.blob.text()) as Record<string, unknown>;
    const changed = `${JSON.stringify({ ...original, changedAfterApproval: true }, null, 2)}\n`;
    files[indexPosition] = {
      ...files[indexPosition]!,
      size: Buffer.byteLength(changed),
      blob: new Blob([changed], { type: "application/json" }),
    };
    await expect(
      verifyBurnExternalAssetSet(files, currentIdentity(FIXTURE_DIR!)),
    ).rejects.toThrow(/Approval asset index/);
  });
});
