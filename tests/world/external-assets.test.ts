import { describe, expect, it } from "vitest";
import {
  BURN_PROTOCOL_AUTHORED_DIGEST,
  BURN_PROTOCOL_CARTRIDGE_ID,
  BURN_PROTOCOL_HANDOFF_SHA256,
  BURN_PROTOCOL_PARENT_SHA256,
  BURN_PROTOCOL_PUBLICATION_HEAD,
  clearExternalAssetSession,
  getExternalAssetSession,
  installExternalAssetSession,
  prepareExternalAssetCustody,
  sha256Bytes,
  sha256Text,
  verifyExternalAssetFiles,
  type HolderAssetFile,
} from "../../src/world/external-assets.js";

const BOUNDARY = {
  inheritedHistory: "read-only",
  liveRuns: "counterfactual-only",
  panelPayloads: "not-present",
  storyChanges: "none",
} as const;

const RELATIONSHIP = "supplemental-external-evidence-does-not-change-authored-identity";

class MemoryFile implements HolderAssetFile {
  readonly size: number;
  readonly type: string;

  constructor(
    readonly name: string,
    private readonly bytes: Uint8Array,
    readonly webkitRelativePath = "",
    type = "image/png",
  ) {
    this.size = bytes.byteLength;
    this.type = type;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.bytes.slice().buffer;
  }
}

interface FixtureOptions {
  production?: boolean;
  assets?: Array<{ path: string; bytes: Uint8Array; classification?: string }>;
}

async function fixture(options: FixtureOptions = {}) {
  const rows = options.assets ?? [{ path: "assets/E12-C3-P01.png", bytes: new Uint8Array([1, 2, 3, 4]) }];
  const assets = await Promise.all(rows.map(async (row) => ({
    path: row.path,
    sha256: await sha256Bytes(row.bytes),
    bytes: row.bytes.byteLength,
    classification: row.classification ?? "panel-raster",
  })));
  const counts: Record<string, number> = {};
  for (const asset of assets) counts[asset.classification] = (counts[asset.classification] ?? 0) + 1;
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const indexText = `${JSON.stringify({
    format: "burn-protocol-corpus-asset-index/1",
    generatedFrom: "verified nested v0.58.0 manifest",
    counts,
    assets,
  }, null, 2)}\n`;
  const indexSha256 = await sha256Text(indexText);
  const production = options.production ?? false;
  const overlay = {
    format: "burn-protocol-handoff-publication-overlay/1",
    status: "pass",
    classification: production ? "production-exact-external-custody" : "mechanism-fixture-external-custody",
    evidenceTier: production ? "production-exact-intake" : "mechanism-fixture",
    controlQuestion: "Can public truth produce accountable repair without creating a sovereign owner of the record?",
    authoredBoundary: BOUNDARY,
    cartridge: {
      id: BURN_PROTOCOL_CARTRIDGE_ID,
      version: "0.1.1",
      engineVersion: "1.3.0",
      sourcePlane: "common-ship-pocket/1",
      authoredArcDigest: BURN_PROTOCOL_AUTHORED_DIGEST,
      exactParentSha256: BURN_PROTOCOL_PARENT_SHA256,
      publicationAuthorityHead: BURN_PROTOCOL_PUBLICATION_HEAD,
    },
    externalCustody: {
      relationship: RELATIONSHIP,
      runtimeBundling: "none",
      handoff: production
        ? { sha256: BURN_PROTOCOL_HANDOFF_SHA256, bytes: 363_384_929, entries: 24 }
        : { sha256: "1".repeat(64), bytes: 7_084, entries: 24 },
      parent: production
        ? {
            sha256: BURN_PROTOCOL_PARENT_SHA256,
            bytes: 353_717_668,
            entries: 1_986,
            manifestRecords: 1_985,
            manifestUncompressedBytes: 383_401_783,
          }
        : {
            sha256: "2".repeat(64),
            bytes: 934,
            entries: 4,
            manifestRecords: 3,
            manifestUncompressedBytes: 131,
          },
      assetIndex: { sha256: indexSha256, assets: assets.length, bytes: totalBytes, counts },
    },
  };
  const overlayText = `${JSON.stringify(overlay, null, 2)}\n`;
  const overlaySha256 = await sha256Text(overlayText);
  const receiptText = `${JSON.stringify({
    format: "burn-protocol-handoff-publication-activation-receipt/1",
    status: "pass",
    evidenceTier: overlay.evidenceTier,
    cartridge: overlay.cartridge,
    authority: {
      authoredBoundary: BOUNDARY,
      custodyRelation: RELATIONSHIP,
      runtimeBundling: "none",
    },
    externalAssets: { sha256: indexSha256, assets: assets.length, bytes: totalBytes, counts },
    overlay: {
      path: "burn-protocol-handoff-publication-overlay.json",
      sha256: overlaySha256,
      bytes: new TextEncoder().encode(overlayText).byteLength,
    },
  }, null, 2)}\n`;
  return { rows, assets, indexText, overlayText, receiptText };
}

describe("Burn Protocol holder-controlled external assets", () => {
  it("accepts activation-bound fixture custody without granting production standing", async () => {
    const value = await fixture();
    const custody = await prepareExternalAssetCustody(value);
    expect(custody).toMatchObject({
      cartridgeId: BURN_PROTOCOL_CARTRIDGE_ID,
      authoredArcDigest: BURN_PROTOCOL_AUTHORED_DIGEST,
      publicationAuthorityHead: BURN_PROTOCOL_PUBLICATION_HEAD,
      standing: "mechanism-fixture",
      evidenceTier: "mechanism-fixture",
      totalBytes: 4,
    });
    expect(custody.index.counts).toEqual({ "panel-raster": 1 });
  });

  it("grants production standing only to the exact A13C1 handoff and v0.58.0 parent", async () => {
    const value = await fixture({ production: true });
    const custody = await prepareExternalAssetCustody(value);
    expect(custody.standing).toBe("production-exact");

    const changed = JSON.parse(value.overlayText) as Record<string, any>;
    changed.externalCustody.handoff.sha256 = "3".repeat(64);
    const overlayText = `${JSON.stringify(changed, null, 2)}\n`;
    const receipt = JSON.parse(value.receiptText) as Record<string, any>;
    receipt.overlay.sha256 = await sha256Text(overlayText);
    receipt.overlay.bytes = new TextEncoder().encode(overlayText).byteLength;
    await expect(prepareExternalAssetCustody({
      ...value,
      overlayText,
      receiptText: `${JSON.stringify(receipt, null, 2)}\n`,
    })).rejects.toThrow(/exact A13C1 handoff/i);
  });

  it("refuses an overlay changed after the activation receipt was issued", async () => {
    const value = await fixture();
    await expect(prepareExternalAssetCustody({
      ...value,
      overlayText: value.overlayText.replace("mechanism-fixture-external-custody", "mechanism-fixture-external-custody-changed"),
    })).rejects.toThrow(/overlay bytes do not match/i);
  });

  it("verifies an exact holder file by directory-relative path and reports partial custody", async () => {
    const value = await fixture({
      assets: [
        { path: "assets/E12-C3-P01.png", bytes: new Uint8Array([1, 2, 3, 4]) },
        { path: "assets/E12-C3-P02.png", bytes: new Uint8Array([5, 6, 7]) },
      ],
    });
    const custody = await prepareExternalAssetCustody(value);
    const progress: number[] = [];
    const result = await verifyExternalAssetFiles(custody, [
      new MemoryFile("E12-C3-P01.png", value.rows[0]!.bytes, "holder-root/assets/E12-C3-P01.png"),
    ], (entry) => progress.push(entry.processed));
    expect(result).toMatchObject({ verifiedBytes: 4, complete: false, unmatchedFiles: [] });
    expect(result.verified.map((item) => item.asset.path)).toEqual(["assets/E12-C3-P01.png"]);
    expect(result.missing.map((item) => item.path)).toEqual(["assets/E12-C3-P02.png"]);
    expect(progress).toEqual([0, 1]);
  });

  it("atomically refuses a selected file whose manifest hash differs", async () => {
    const value = await fixture();
    const custody = await prepareExternalAssetCustody(value);
    await expect(verifyExternalAssetFiles(custody, [
      new MemoryFile("E12-C3-P01.png", new Uint8Array([1, 2, 3, 5]), "assets/E12-C3-P01.png"),
    ])).rejects.toThrow(/SHA-256 does not match/i);
    expect(getExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST)).toBeNull();
  });

  it("requires a relative path when duplicate basenames exist", async () => {
    const value = await fixture({
      assets: [
        { path: "panels/A/E12-C3-P01.png", bytes: new Uint8Array([1]) },
        { path: "panels/B/E12-C3-P01.png", bytes: new Uint8Array([2]) },
      ],
    });
    const custody = await prepareExternalAssetCustody(value);
    await expect(verifyExternalAssetFiles(custody, [
      new MemoryFile("E12-C3-P01.png", new Uint8Array([1])),
    ])).rejects.toThrow(/ambiguous/i);
  });

  it("holds verified files only in the revocable process session", async () => {
    const value = await fixture();
    const custody = await prepareExternalAssetCustody(value);
    const verification = await verifyExternalAssetFiles(custody, [
      new MemoryFile("E12-C3-P01.png", value.rows[0]!.bytes, "assets/E12-C3-P01.png"),
    ]);
    const session = installExternalAssetSession(custody, verification);
    expect(session).toMatchObject({
      authoredArcDigest: BURN_PROTOCOL_AUTHORED_DIGEST,
      standing: "mechanism-fixture",
      totalAssets: 1,
      complete: true,
      verifiedBytes: 4,
    });
    expect(session.assets[0]?.objectUrl).toBeNull();
    expect(getExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST)).toBe(session);
    clearExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST);
    expect(getExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST)).toBeNull();
  });
});
