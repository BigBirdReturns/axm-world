import { describe, expect, it } from "vitest";
import {
  advanceCanonicalStory,
  canonicalStoryCoverage,
  canonicalStoryCursorForPanel,
  parseCanonicalStory,
  retreatCanonicalStory,
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
        title: "First Episode",
        complete: true,
        nextChapterId: null,
        chapters: [{
          id: "E01-C1",
          number: 1,
          title: "First Chapter",
          complete: true,
          openingPanelId: "E01-C1-P01",
          terminalPanelId: "E01-C1-P02",
          previousPanelId: null,
          nextPanelId: "E02-C1-P01",
          panels: [
            panel("E01-C1-P01", 1, "E01-C1", null, "E01-C1-P02"),
            panel("E01-C1-P02", 2, "E01-C1", "E01-C1-P01", "E02-C1-P01"),
          ],
          plates: [],
        }],
      },
      {
        id: "E02",
        number: 2,
        title: "Second Episode",
        complete: false,
        nextChapterId: "E02-C2",
        chapters: [{
          id: "E02-C1",
          number: 1,
          title: "Second Opening",
          complete: true,
          openingPanelId: "E02-C1-P01",
          terminalPanelId: "E02-C1-P01",
          previousPanelId: "E01-C1-P02",
          nextPanelId: "E02-C2-P02",
          panels: [
            panel("E02-C1-P01", 1, "E02-C1", "E01-C1-P02", "E02-C2-P02"),
          ],
          plates: [],
        }],
      },
    ],
  });
}

describe("World multi-episode canonical-story law", () => {
  it("crosses a present episode seam in both directions", () => {
    const story = fixture();
    const terminal = canonicalStoryCursorForPanel(story, "E01-C1-P02");
    const forward = advanceCanonicalStory(story, terminal);
    expect(forward.kind).toBe("panel");
    if (forward.kind !== "panel") throw new Error("Expected the Episode 2 opening panel.");
    expect(forward.cursor).toEqual({
      storyId: "two-episode-story",
      episodeId: "E02",
      chapterId: "E02-C1",
      panelId: "E02-C1-P01",
    });
    expect(forward.receipt).toMatchObject({
      episodeId: "E02",
      chapterId: "E02-C1",
      fromPanelId: "E01-C1-P02",
      toPanelId: "E02-C1-P01",
      canonical: true,
    });

    const reverse = retreatCanonicalStory(story, forward.cursor);
    expect(reverse.kind).toBe("panel");
    if (reverse.kind !== "panel") throw new Error("Expected the Episode 1 terminal panel.");
    expect(reverse.cursor).toMatchObject({
      episodeId: "E01",
      chapterId: "E01-C1",
      panelId: "E01-C1-P02",
    });
  });

  it("reports only the target outside the published two-episode extent", () => {
    const story = fixture();
    expect(canonicalStoryCoverage(story)).toMatchObject({
      episodes: 2,
      chapters: 2,
      panels: 3,
      continuationPanelIds: ["E02-C2-P02"],
      incompleteEpisodeIds: ["E02"],
    });
    const terminal = canonicalStoryCursorForPanel(story, "E02-C1-P01");
    expect(advanceCanonicalStory(story, terminal)).toEqual({
      kind: "extent-complete",
      cursor: terminal,
      continuationPanelId: "E02-C2-P02",
    });
  });

  it("refuses a cursor whose episode identity disagrees with its panel", () => {
    const story = fixture();
    const cursor = canonicalStoryCursorForPanel(story, "E02-C1-P01");
    expect(() => advanceCanonicalStory(story, {
      ...cursor,
      episodeId: "E01",
    })).toThrow(/episode or chapter does not match/i);
  });
});
