import { describe, expect, it } from "vitest";
import {
  advanceCanonicalStory,
  canonicalStoryCoverage,
  canonicalStoryCursorForPanel,
  parseCanonicalStory,
  retreatCanonicalStory,
  type CanonicalStoryChapter,
  type CanonicalStorySource,
} from "../../src/canonical-story/index.js";

function panel(
  id: string,
  ordinal: number,
  chapterId: string,
  previousPanelId: string | null,
  nextPanelId: string | null,
) {
  return {
    id,
    ordinal,
    chapterId,
    previousPanelId,
    nextPanelId,
    asset: {
      id: `asset:${id}`,
      path: `site/assets/panels/${id}.webp`,
      bytes: ordinal,
      sha256: String(ordinal).padStart(64, "0"),
      mimeType: "image/webp" as const,
      availability: "manifested-external" as const,
      visualStanding: "accepted" as const,
    },
    text: {
      status: "resolved" as const,
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
  openingPanelId: string,
  terminalPanelId: string,
  previousPanelId: string | null,
  nextPanelId: string | null,
  panels: ReturnType<typeof panel>[],
): CanonicalStoryChapter {
  return {
    id,
    number,
    title: `Chapter ${number}`,
    complete: true,
    openingPanelId,
    terminalPanelId,
    previousPanelId,
    nextPanelId,
    panels,
    plates: [],
  };
}

function fixture(): CanonicalStorySource {
  return parseCanonicalStory({
    format: "axm-canonical-story/1",
    identity: { id: "two-episode-story", title: "Two Episodes", version: "0.2.0" },
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
      sha256: "a".repeat(64),
      role: "canonical-source",
      available: true,
    }],
    episodes: [
      {
        id: "E01",
        number: 1,
        title: "Episode One",
        complete: true,
        nextChapterId: null,
        chapters: [
          chapter(
            "E01-C1",
            1,
            "E01-C1-P01",
            "E01-C1-P02",
            null,
            "E02-C1-P01",
            [
              panel("E01-C1-P01", 1, "E01-C1", null, "E01-C1-P02"),
              panel("E01-C1-P02", 2, "E01-C1", "E01-C1-P01", "E02-C1-P01"),
            ],
          ),
        ],
      },
      {
        id: "E02",
        number: 2,
        title: "Episode Two",
        complete: true,
        nextChapterId: null,
        chapters: [
          chapter(
            "E02-C1",
            1,
            "E02-C1-P01",
            "E02-C1-P02",
            "E01-C1-P02",
            "E03-C1-P01",
            [
              panel("E02-C1-P01", 1, "E02-C1", "E01-C1-P02", "E02-C1-P02"),
              panel("E02-C1-P02", 2, "E02-C1", "E02-C1-P01", "E03-C1-P01"),
            ],
          ),
        ],
      },
    ],
  });
}

describe("World multi-episode canonical-story law", () => {
  it("traverses a present episode seam in both directions", () => {
    const story = fixture();
    const terminal = canonicalStoryCursorForPanel(story, "E01-C1-P02");
    const forward = advanceCanonicalStory(story, terminal);
    expect(forward.kind).toBe("panel");
    if (forward.kind !== "panel") throw new Error("Expected Episode 2 opening.");
    expect(forward.cursor).toMatchObject({
      episodeId: "E02",
      chapterId: "E02-C1",
      panelId: "E02-C1-P01",
    });
    expect(forward.receipt).toMatchObject({
      episodeId: "E02",
      fromPanelId: "E01-C1-P02",
      toPanelId: "E02-C1-P01",
      chapterId: "E02-C1",
      canonical: true,
    });

    const reverse = retreatCanonicalStory(story, forward.cursor);
    expect(reverse.kind).toBe("panel");
    if (reverse.kind === "panel") {
      expect(reverse.cursor).toMatchObject({
        episodeId: "E01",
        chapterId: "E01-C1",
        panelId: "E01-C1-P02",
      });
    }
  });

  it("reports only the continuation outside the represented series extent", () => {
    const story = fixture();
    expect(canonicalStoryCoverage(story)).toMatchObject({
      episodes: 2,
      chapters: 2,
      panels: 4,
      continuationPanelIds: ["E03-C1-P01"],
    });
    const terminal = canonicalStoryCursorForPanel(story, "E02-C1-P02");
    expect(advanceCanonicalStory(story, terminal)).toEqual({
      kind: "extent-complete",
      cursor: terminal,
      continuationPanelId: "E03-C1-P01",
    });
  });
});
