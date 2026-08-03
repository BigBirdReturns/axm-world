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
      status: "source-required",
      expectedSourceReceiptIds: ["source"],
      reason: "Exact canonical text is outside the fixture.",
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
      status: "source-required",
      expectedSourceReceiptIds: ["source"],
      reason: "Exact canonical text is outside the fixture.",
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
      id: "episode-5-story",
      title: "Episode 5 Chapter 1 Story",
      version: "0.11.0",
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
      available: false,
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
        "E01-C1", 1, "Episode One Chapter", null, "E02-C1-P01",
        [manifestedPanel("E01-C1-P01", "E01-C1", 1, null, "E02-C1-P01")],
      )],
    }, {
      id: "E02",
      number: 2,
      title: "Episode Two",
      complete: true,
      nextChapterId: null,
      chapters: [chapter(
        "E02-C1", 1, "Episode Two Chapter", "E01-C1-P01", "E03-C1-P01",
        [manifestedPanel("E02-C1-P01", "E02-C1", 1, "E01-C1-P01", "E03-C1-P01")],
      )],
    }, {
      id: "E03",
      number: 3,
      title: "The Omega Thread",
      complete: true,
      nextChapterId: null,
      chapters: [chapter(
        "E03-C1", 1, "Headquarters", "E02-C1-P01", "E03-C2-P31",
        [manifestedPanel("E03-C1-P01", "E03-C1", 1, "E02-C1-P01", "E03-C2-P31")],
      ), chapter(
        "E03-C2", 2, "Lockout", "E03-C1-P01", "E03-C3-P60",
        [sourceRequiredPanel("E03-C2-P31", "E03-C2", 1, "E03-C1-P01", "E03-C3-P60")],
      ), chapter(
        "E03-C3", 3, "Prime Incident", "E03-C2-P31", "E04-C1-P01",
        [manifestedPanel("E03-C3-P60", "E03-C3", 1, "E03-C2-P31", "E04-C1-P01")],
      )],
    }, {
      id: "E04",
      number: 4,
      title: "Fractured Allegiances",
      complete: true,
      nextChapterId: null,
      chapters: [chapter(
        "E04-C1", 1, "Osyraa's Offer", "E03-C3-P60", "E04-C2-P21",
        [
          manifestedPanel("E04-C1-P01", "E04-C1", 1, "E03-C3-P60", "E04-C1-P20"),
          manifestedPanel("E04-C1-P20", "E04-C1", 2, "E04-C1-P01", "E04-C2-P21"),
        ],
      ), chapter(
        "E04-C2", 2, "Georgiou's Pattern", "E04-C1-P20", "E04-C3-P41",
        [
          manifestedPanel("E04-C2-P21", "E04-C2", 1, "E04-C1-P20", "E04-C2-P40"),
          manifestedPanel("E04-C2-P40", "E04-C2", 2, "E04-C2-P21", "E04-C3-P41"),
        ],
      ), chapter(
        "E04-C3", 3, "The Dead Man's Checksum", "E04-C2-P40", "E05-C1-P01",
        [
          manifestedPanel("E04-C3-P41", "E04-C3", 1, "E04-C2-P40", "E04-C3-P60"),
          manifestedPanel("E04-C3-P60", "E04-C3", 2, "E04-C3-P41", "E05-C1-P01"),
        ],
      )],
    }, {
      id: "E05",
      number: 5,
      title: "Nursery World",
      complete: false,
      nextChapterId: "E05-C2",
      chapters: [chapter(
        "E05-C1", 1, "The Song", "E04-C3-P60", "E05-C2-P21",
        [
          manifestedPanel("E05-C1-P01", "E05-C1", 1, "E04-C3-P60", "E05-C1-P20"),
          manifestedPanel("E05-C1-P20", "E05-C1", 2, "E05-C1-P01", "E05-C2-P21"),
        ],
      )],
    }],
  });
}

describe("World Episode 5 Chapter 1 receiver law", () => {
  it("crosses the Episode 4 to Episode 5 seam in both directions", () => {
    const story = fixture();
    const terminal = canonicalStoryCursorForPanel(story, "E04-C3-P60");
    const forward = advanceCanonicalStory(story, terminal);
    expect(forward.kind).toBe("panel");
    if (forward.kind !== "panel") throw new Error("Expected Nursery World opening.");
    expect(forward.cursor).toEqual({
      storyId: "episode-5-story",
      episodeId: "E05",
      chapterId: "E05-C1",
      panelId: "E05-C1-P01",
    });
    expect(forward.receipt).toMatchObject({
      fromPanelId: "E04-C3-P60",
      toPanelId: "E05-C1-P01",
      episodeId: "E05",
      chapterId: "E05-C1",
      canonical: true,
    });

    const reverse = retreatCanonicalStory(story, forward.cursor);
    expect(reverse.kind).toBe("panel");
    if (reverse.kind === "panel") {
      expect(reverse.cursor).toMatchObject({
        episodeId: "E04",
        chapterId: "E04-C3",
        panelId: "E04-C3-P60",
      });
    }
  });

  it("keeps Episode 5 incomplete and reports Chapter 2 as the sole outside continuation", () => {
    const story = fixture();
    expect(canonicalStoryCoverage(story)).toEqual({
      episodes: 5,
      chapters: 9,
      panels: 13,
      plates: 0,
      resolvedTextPanels: 0,
      unresolvedTextPanels: 13,
      resolvedPlateMappings: 0,
      unresolvedPlateMappings: 0,
      choiceNodes: 0,
      productionReady: false,
      incompleteEpisodeIds: ["E05"],
      continuationPanelIds: ["E05-C2-P21"],
    });
    const terminal = canonicalStoryCursorForPanel(story, "E05-C1-P20");
    expect(advanceCanonicalStory(story, terminal)).toEqual({
      kind: "extent-complete",
      cursor: terminal,
      continuationPanelId: "E05-C2-P21",
    });
  });

  it("preserves the inherited P31 refusal while receiving the Episode 5 source-ledger extent", () => {
    const story = fixture();
    const p31 = story.episodes[2]!.chapters[1]!.panels[0]!;
    expect(canonicalStoryAssetIsManifested(p31.asset)).toBe(false);
    expect(p31.asset).toMatchObject({
      status: "source-required",
      id: "asset:E03-C2-P31",
      expectedBytes: 156208,
    });
    expect("sha256" in p31.asset).toBe(false);
    expect(story.episodes[4]).toMatchObject({
      id: "E05",
      title: "Nursery World",
      complete: false,
      nextChapterId: "E05-C2",
    });
    expect(story.episodes[4]!.chapters.map((candidate) => candidate.title)).toEqual([
      "The Song",
    ]);
    expect(story.episodes[4]!.chapters[0]!.panels.every(
      (panel) => panel.text.status === "source-required",
    )).toBe(true);
  });
});
