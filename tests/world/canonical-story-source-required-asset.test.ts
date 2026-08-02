import { describe, expect, it } from "vitest";
import {
  canonicalStoryAssetIsManifested,
  canonicalStoryCoverage,
  parseCanonicalStory,
  type CanonicalStorySource,
} from "../../src/canonical-story/index.js";
import {
  verifyCanonicalStoryAssetFiles,
  type CanonicalStoryHolderFile,
} from "../../src/world/sequence/assets.js";

class MemoryFile implements CanonicalStoryHolderFile {
  readonly size: number;
  readonly type = "image/webp";

  constructor(
    readonly name: string,
    private readonly bytes: Uint8Array,
    readonly webkitRelativePath = "",
  ) {
    this.size = bytes.byteLength;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.bytes.slice().buffer;
  }
}

function fixture(): CanonicalStorySource {
  return parseCanonicalStory({
    format: "axm-canonical-story/1",
    identity: { id: "asset-gap-story", title: "Asset Gap Story", version: "0.1.0" },
    sourcePlane: { format: "fixture/1", extensionKey: "fixture.story@1" },
    authority: {
      pathPolicy: "canonical-fixed",
      choicePolicy: "none",
      textAuthority: "exact-source-required",
      assetAuthority: "external-manifest",
    },
    sourceReceipts: [{
      id: "asset-manifest",
      path: "manifests/assets.csv",
      bytes: 1,
      sha256: "a".repeat(64),
      role: "asset-manifest",
      available: false,
    }, {
      id: "text-source",
      path: "source/story.json",
      bytes: 1,
      sha256: "b".repeat(64),
      role: "canonical-source",
      available: true,
    }],
    episodes: [{
      id: "E01",
      number: 1,
      title: "Episode",
      complete: true,
      nextChapterId: null,
      chapters: [{
        id: "E01-C1",
        number: 1,
        title: "Chapter",
        complete: true,
        openingPanelId: "E01-C1-P01",
        terminalPanelId: "E01-C1-P01",
        previousPanelId: null,
        nextPanelId: null,
        panels: [{
          id: "E01-C1-P01",
          ordinal: 1,
          chapterId: "E01-C1",
          previousPanelId: null,
          nextPanelId: null,
          asset: {
            status: "source-required",
            id: "asset:E01-C1-P01",
            path: "site/assets/panels/E01-C1-P01.webp",
            expectedBytes: 4,
            mimeType: "image/webp",
            availability: "manifested-external",
            visualStanding: "missing",
            expectedSourceReceiptIds: ["asset-manifest"],
            reason: "The exact SHA-256 receipt is unavailable.",
          },
          text: {
            status: "resolved",
            sourceReceiptIds: ["text-source"],
            captions: [],
            dialogue: [],
            soundEffects: [],
            altText: "Panel whose media receipt is unresolved.",
          },
        }],
        plates: [],
      }],
    }],
  });
}

describe("World source-required canonical asset boundary", () => {
  it("keeps a structurally complete story non-production-ready until every asset receipt is exact", () => {
    const story = fixture();
    const asset = story.episodes[0]!.chapters[0]!.panels[0]!.asset;
    expect(canonicalStoryAssetIsManifested(asset)).toBe(false);
    expect(canonicalStoryCoverage(story)).toMatchObject({
      panels: 1,
      resolvedTextPanels: 1,
      unresolvedTextPanels: 0,
      productionReady: false,
    });
  });

  it("refuses holder bytes for a source-required asset before hashing", async () => {
    const story = fixture();
    await expect(verifyCanonicalStoryAssetFiles(story, [
      new MemoryFile(
        "E01-C1-P01.webp",
        new Uint8Array([1, 2, 3, 4]),
        "holder/site/assets/panels/E01-C1-P01.webp",
      ),
    ])).rejects.toThrow(/exact asset receipt is source-required/i);
  });
});
