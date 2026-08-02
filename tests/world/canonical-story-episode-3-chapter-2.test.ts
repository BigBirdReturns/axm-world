import { describe, expect, it } from "vitest";
import {
  advanceCanonicalStory,
  canonicalStoryAssetIsManifested,
  canonicalStoryCoverage,
  canonicalStoryCursorForPanel,
  parseCanonicalStory,
  retreatCanonicalStory,
  type CanonicalStoryChapter,
  type CanonicalStoryPanel,
  type CanonicalStorySource,
} from "../../src/canonical-story/index.js";

function manifestedPanel(
  id: string,
  chapterId: string,
  ordinal: number,
  previousPanelId: string | null,
  nextPanelId: string | null,
): CanonicalStoryPanel {
  return {
    id,
    ordinal,
    chapterId,
    previousPanelId,
    nextPanelId,
    asset: {
      id: `asset:${id}`,
      path: `site/assets/panels/${id}.webp`,
      bytes: 1,
      sha256: "a".repeat(64),
      mimeType: "image/webp",
      availability: "manifested-external",
      visualStanding: "accepted",
    },
    text: {
      status: "resolved",
      sourceReceiptIds: ["source"],
      captions: [],
      dialogue: [],
      soundEffects: [],
      altText: id,
    },
  };
}

function sourceRequiredPanel(
  id: string,
  chapterId: string,
  ordinal: number,
  previousPanelId: string,
  nextPanelId: string,
): CanonicalStoryPanel {
  return {
    id,
    ordinal,
    chapterId,
    previousPanelId,
    nextPanelId,
    asset: {
      status: "source-required",
      id: `asset:${id}`,
      path: `site/assets/art/A03C2/panels/${id}.webp`,
      expectedBytes: 156208,
      mimeType: "image/webp",
      availability: "manifested-external",
      visualStanding: "missing",
      expectedSourceReceiptIds: ["a03c2-art-manifest"],
      reason: "The exact SHA-256 receipt is unavailable.",
    },
    text: {
      status: "resolved",
      sourceReceiptIds: ["source"],
      captions: [],
      dialogue: [],
      soundEffects: [],
      altText: id,
    },
  };
}

function chapter(
  id: string,
  number: number,
  title: string,
  previousPanelId: string | null,
  nextPanelId: string | null,
  panels: CanonicalStoryPanel[],
): CanonicalStoryChapter {
  return {
    id,
    number,
    title,
    complete: true,
    openingPanelId: panels[0]!.id,
    terminalPanelId: panels.at(-1)!.id,
    previousPanelId,
    nextPanelId,
    panels,
    plates: [],
  };
}

function fixture(): CanonicalStorySource {
  return parseCanonicalStory({
    format: "axm-canonical-story/1",
    identity: {
      id: "lockout-story",
      title: "Lockout Story",
      version: "0.6.0",
    },
    sourcePlane: { format: "fixture/1", extensionKey: "fixture.story@1" },
    authority: {
      pathPolicy: "canonical-fixed",
      choicePolicy: "none",
      textAuthority: "exact-source-required",
      assetAuthority: "external-manifest",
    },
    sourceReceipts: [{
      id: "source",
      path: "source/story.json",
      bytes: 1,
      sha256: "b".repeat(64),
      role: "canonical-source",
      available: true,
    }, {
      id: "a03c2-art-manifest",
      path: "manifests/a03c2-art-manifest.csv",
      bytes: 1,
      sha256: "c".repeat(64),
      role: "asset-manifest",
      available: false,
    }],
    episodes: [{
      id: "E01",
      number: 1,
      title: "Episode One",
      complete: true,
      nextChapterId: null,
      chapters: [chapter(
        "E01-C1",
        1,
        "Episode One Chapter",
        null,
        "E02-C1-P01",
        [manifestedPanel("E01-C1-P01", "E01-C1", 1, null, "E02-C1-P01")],
      )],
    }, {
      id: "E02",
      number: 2,
      title: "Episode Two",
      complete: true,
      nextChapterId: null,
      chapters: [chapter(
        "E02-C1",
        1,
        "Episode Two Chapter",
        "E01-C1-P01",
        "E03-C1-P20",
        [manifestedPanel("E02-C1-P01", "E02-C1", 1, "E01-C1-P01", "E03-C1-P20")],
      )],
    }, {
      id: "E03",
      number: 3,
      title: "The Omega Thread",
      complete: false,
      nextChapterId: "E03-C3",
      chapters: [chapter(
        "E03-C1",
        1,
        "Headquarters",
        "E02-C1-P01",
        "E03-C2-P21",
        [manifestedPanel("E03-C1-P20", "E03-C1", 20, "E02-C1-P01", "E03-C2-P21")],
      ), chapter(
        "E03-C2",
        2,
        "Lockout",
        "E03-C1-P20",
        "E03-C3-P41",
        [
          manifestedPanel("E03-C2-P21", "E03-C2", 21, "E03-C1-P20", "E03-C2-P31"),
          sourceRequiredPanel("E03-C2-P31", "E03-C2", 31, "E03-C2-P21", "E03-C2-P40"),
          manifestedPanel("E03-C2-P40", "E03-C2", 40, "E03-C2-P31", "E03-C3-P41"),
        ],
      )],
    }],
  });
}

describe("World Episode 3 Lockout receiver law", () => {
  it("crosses the Headquarters-to-Lockout seam in both directions", () => {
    const story = fixture();
    const headquartersTerminal = canonicalStoryCursorForPanel(story, "E03-C1-P20");
    const forward = advanceCanonicalStory(story, headquartersTerminal);
    expect(forward.kind).toBe("panel");
    if (forward.kind !== "panel") throw new Error("Expected Lockout opening.");
    expect(forward.cursor).toEqual({
      storyId: "lockout-story",
      episodeId: "E03",
      chapterId: "E03-C2",
      panelId: "E03-C2-P21",
    });
    expect(forward.receipt).toMatchObject({
      fromPanelId: "E03-C1-P20",
      toPanelId: "E03-C2-P21",
      episodeId: "E03",
      chapterId: "E03-C2",
      canonical: true,
    });

    const reverse = retreatCanonicalStory(story, forward.cursor);
    expect(reverse.kind).toBe("panel");
    if (reverse.kind === "panel") {
      expect(reverse.cursor).toMatchObject({
        episodeId: "E03",
        chapterId: "E03-C1",
        panelId: "E03-C1-P20",
      });
    }
  });

  it("preserves P31 as a source-required asset without fabricated custody", () => {
    const story = fixture();
    const lockout = story.episodes[2]!.chapters[1]!;
    const p31 = lockout.panels.find((panel) => panel.id === "E03-C2-P31")!;
    expect(canonicalStoryAssetIsManifested(p31.asset)).toBe(false);
    expect(p31.asset).toMatchObject({
      status: "source-required",
      path: "site/assets/art/A03C2/panels/E03-C2-P31.webp",
      expectedBytes: 156208,
      expectedSourceReceiptIds: ["a03c2-art-manifest"],
    });
    expect("bytes" in p31.asset).toBe(false);
    expect("sha256" in p31.asset).toBe(false);
    expect(canonicalStoryCoverage(story)).toEqual({
      episodes: 3,
      chapters: 4,
      panels: 6,
      plates: 0,
      resolvedTextPanels: 6,
      unresolvedTextPanels: 0,
      resolvedPlateMappings: 0,
      unresolvedPlateMappings: 0,
      choiceNodes: 0,
      productionReady: false,
      incompleteEpisodeIds: ["E03"],
      continuationPanelIds: ["E03-C3-P41"],
    });
  });

  it("stops at Prime Incident without moving the Lockout terminal cursor", () => {
    const story = fixture();
    const terminal = canonicalStoryCursorForPanel(story, "E03-C2-P40");
    expect(advanceCanonicalStory(story, terminal)).toEqual({
      kind: "extent-complete",
      cursor: terminal,
      continuationPanelId: "E03-C3-P41",
    });
  });
});
