import { describe, expect, it } from "vitest";
import {
  advanceCanonicalStory,
  canonicalStoryCoverage,
  initialCanonicalStoryCursor,
  parseCanonicalStory,
  type CanonicalStorySource,
} from "../../src/canonical-story/index.js";
import {
  sha256Bytes,
  verifyCanonicalStoryAssetFiles,
  type CanonicalStoryHolderFile,
} from "../../src/world/sequence/assets.js";
import {
  CANONICAL_STORY_SESSION_FORMAT,
  initialCanonicalStorySession,
  loadCanonicalStorySession,
  saveCanonicalStorySession,
  validateCanonicalStorySession,
  type CanonicalStorySessionStorage,
} from "../../src/world/sequence/session.js";

class MemoryStorage implements CanonicalStorySessionStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

class MemoryFile implements CanonicalStoryHolderFile {
  readonly size: number;
  readonly type: string;

  constructor(
    readonly name: string,
    private readonly bytes: Uint8Array,
    readonly webkitRelativePath = "",
    type = "image/webp",
  ) {
    this.size = bytes.byteLength;
    this.type = type;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.bytes.slice().buffer;
  }
}

async function fixture(): Promise<{ story: CanonicalStorySource; bytes: Uint8Array }> {
  const bytes = new Uint8Array([1, 4, 9, 16]);
  const digest = await sha256Bytes(bytes);
  const story: CanonicalStorySource = {
    format: "axm-canonical-story/1",
    identity: { id: "fixture-story", title: "Fixture Story", version: "0.1.0" },
    sourcePlane: { format: "fixture-story/1", extensionKey: "fixture.story@1" },
    authority: {
      pathPolicy: "canonical-fixed",
      choicePolicy: "none",
      textAuthority: "exact-source-required",
      assetAuthority: "external-manifest",
    },
    sourceReceipts: [{
      id: "fixture-source",
      path: "source/fixture.json",
      bytes: 10,
      sha256: "a".repeat(64),
      role: "canonical-source",
      available: true,
    }],
    episodes: [{
      id: "E01",
      number: 1,
      title: "Fixture Episode",
      complete: true,
      nextChapterId: null,
      chapters: [{
        id: "E01-C1",
        number: 1,
        title: "Fixture Chapter",
        complete: true,
        openingPanelId: "E01-C1-P01",
        terminalPanelId: "E01-C1-P02",
        previousPanelId: null,
        nextPanelId: null,
        panels: [
          {
            id: "E01-C1-P01",
            ordinal: 1,
            chapterId: "E01-C1",
            previousPanelId: null,
            nextPanelId: "E01-C1-P02",
            asset: {
              id: "asset:E01-C1-P01",
              path: "site/assets/panels/E01-C1-P01.webp",
              bytes: bytes.byteLength,
              sha256: digest,
              mimeType: "image/webp",
              availability: "manifested-external",
              visualStanding: "accepted",
            },
            text: {
              status: "resolved",
              sourceReceiptIds: ["fixture-source"],
              captions: [],
              dialogue: [],
              soundEffects: [],
              altText: "Fixture panel one.",
            },
          },
          {
            id: "E01-C1-P02",
            ordinal: 2,
            chapterId: "E01-C1",
            previousPanelId: "E01-C1-P01",
            nextPanelId: null,
            asset: {
              id: "asset:E01-C1-P02",
              path: "site/assets/panels/E01-C1-P02.webp",
              bytes: 3,
              sha256: await sha256Bytes(new Uint8Array([2, 3, 5])),
              mimeType: "image/webp",
              availability: "manifested-external",
              visualStanding: "accepted",
            },
            text: {
              status: "resolved",
              sourceReceiptIds: ["fixture-source"],
              captions: [],
              dialogue: [],
              soundEffects: [],
              altText: "Fixture panel two.",
            },
          },
        ],
        plates: [],
      }],
    }],
  };
  return { story: parseCanonicalStory(story), bytes };
}

describe("World canonical story receiver law", () => {
  it("executes one fixed path with no choice or simulation outcome", async () => {
    const { story } = await fixture();
    const opened = initialCanonicalStoryCursor(story);
    expect(opened.cursor.panelId).toBe("E01-C1-P01");
    const next = advanceCanonicalStory(story, opened.cursor);
    expect(next.kind).toBe("panel");
    if (next.kind !== "panel") throw new Error("Expected the second panel.");
    expect(next.cursor.panelId).toBe("E01-C1-P02");
    expect(advanceCanonicalStory(story, next.cursor)).toEqual({
      kind: "extent-complete",
      cursor: next.cursor,
      continuationPanelId: null,
    });
    expect(canonicalStoryCoverage(story)).toMatchObject({
      panels: 2,
      choiceNodes: 0,
      productionReady: true,
    });
  });

  it("restores a cursor only under the exact Arc digest and known panel", async () => {
    const { story } = await fixture();
    const digest = `cart1_${"b".repeat(64)}`;
    const storage = new MemoryStorage();
    const session = initialCanonicalStorySession(story, digest);
    expect(session.cursor.panelId).toBe("E01-C1-P01");
    session.cursor = {
      ...session.cursor,
      panelId: "E01-C1-P02",
    };
    saveCanonicalStorySession(storage, session);
    expect(loadCanonicalStorySession(storage, story, digest).cursor.panelId).toBe("E01-C1-P02");
    expect(loadCanonicalStorySession(storage, story, `cart1_${"c".repeat(64)}`).cursor.panelId)
      .toBe("E01-C1-P01");

    expect(validateCanonicalStorySession({
      format: CANONICAL_STORY_SESSION_FORMAT,
      authoredArcDigest: digest,
      cursor: { ...session.cursor, panelId: "invented-panel" },
    }, story, digest)).toBeNull();
  });

  it("verifies holder-selected panel bytes against the exact story ledger", async () => {
    const { story, bytes } = await fixture();
    const result = await verifyCanonicalStoryAssetFiles(story, [
      new MemoryFile(
        "E01-C1-P01.webp",
        bytes,
        "holder-estate/site/assets/panels/E01-C1-P01.webp",
      ),
    ]);
    expect(result).toMatchObject({ verifiedBytes: 4, unmatchedPaths: [] });
    expect(result.verified.map((entry) => entry.asset.id)).toEqual(["asset:E01-C1-P01"]);
  });

  it("atomically refuses changed bytes and reports files outside the story", async () => {
    const { story, bytes } = await fixture();
    await expect(verifyCanonicalStoryAssetFiles(story, [
      new MemoryFile("E01-C1-P01.webp", new Uint8Array([1, 4, 9, 17])),
    ])).rejects.toThrow(/SHA-256 does not match/);

    const result = await verifyCanonicalStoryAssetFiles(story, [
      new MemoryFile("E01-C1-P01.webp", bytes),
      new MemoryFile("unrelated.webp", new Uint8Array([8])),
    ]);
    expect(result.unmatchedPaths).toEqual(["unrelated.webp"]);
    expect(result.verified).toHaveLength(1);
  });

  it("refuses an invented branching field before any receiver state exists", async () => {
    const { story } = await fixture();
    const invented = structuredClone(story) as unknown as {
      episodes: Array<{ chapters: Array<{ panels: Array<Record<string, unknown>> }> }>;
    };
    invented.episodes[0]!.chapters[0]!.panels[0]!.choices = [{ id: "leave-canon" }];
    expect(() => parseCanonicalStory(invented)).toThrow(/Unrecognized key.*choices/);
  });
});
