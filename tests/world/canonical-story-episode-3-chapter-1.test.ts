import { describe, expect, it } from "vitest";
import {
  advanceCanonicalStory,
  canonicalStoryCoverage,
  canonicalStoryCursorForPanel,
  initialCanonicalStoryCursor,
  parseCanonicalStory,
  retreatCanonicalStory,
  type CanonicalStoryChapter,
  type CanonicalStorySource,
} from "../../src/canonical-story/index.js";

function panel(
  id: string,
  chapterId: string,
  previousPanelId: string | null,
  nextPanelId: string | null,
) {
  return {
    id,
    ordinal: 1,
    chapterId,
    previousPanelId,
    nextPanelId,
    asset: {
      id: `asset:${id}`,
      path: `site/assets/panels/${id}.webp`,
      bytes: 1,
      sha256: "a".repeat(64),
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
  previousPanelId: string | null,
  nextPanelId: string | null,
): CanonicalStoryChapter {
  const panelId = `${id}-P01`;
  return {
    id,
    number: 1,
    title: `${id} chapter`,
    complete: true,
    openingPanelId: panelId,
    terminalPanelId: panelId,
    previousPanelId,
    nextPanelId,
    panels: [panel(panelId, id, previousPanelId, nextPanelId)],
    plates: [],
  };
}

function fixture(): CanonicalStorySource {
  return parseCanonicalStory({
    format: "axm-canonical-story/1",
    identity: {
      id: "three-episode-story",
      title: "Three Episode Story",
      version: "0.3.0",
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
    }],
    episodes: [
      {
        id: "E01",
        number: 1,
        title: "Episode One",
        complete: true,
        nextChapterId: null,
        chapters: [chapter("E01-C1", null, "E02-C1-P01")],
      },
      {
        id: "E02",
        number: 2,
        title: "Episode Two",
        complete: true,
        nextChapterId: null,
        chapters: [chapter("E02-C1", "E01-C1-P01", "E03-C1-P01")],
      },
      {
        id: "E03",
        number: 3,
        title: "Episode Three",
        complete: false,
        nextChapterId: "E03-C2",
        chapters: [chapter("E03-C1", "E02-C1-P01", "E03-C2-P02")],
      },
    ],
  });
}

describe("World third-episode canonical-story law", () => {
  it("crosses the second-to-third episode seam in both directions", () => {
    const story = fixture();
    const episode2Terminal = canonicalStoryCursorForPanel(story, "E02-C1-P01");
    const forward = advanceCanonicalStory(story, episode2Terminal);
    expect(forward.kind).toBe("panel");
    if (forward.kind !== "panel") throw new Error("Expected the third-episode opening.");
    expect(forward.cursor).toEqual({
      storyId: "three-episode-story",
      episodeId: "E03",
      chapterId: "E03-C1",
      panelId: "E03-C1-P01",
    });
    expect(forward.receipt).toMatchObject({
      fromPanelId: "E02-C1-P01",
      toPanelId: "E03-C1-P01",
      episodeId: "E03",
      chapterId: "E03-C1",
      canonical: true,
    });

    const reverse = retreatCanonicalStory(story, forward.cursor);
    expect(reverse.kind).toBe("panel");
    if (reverse.kind === "panel") {
      expect(reverse.cursor).toMatchObject({
        episodeId: "E02",
        chapterId: "E02-C1",
        panelId: "E02-C1-P01",
      });
    }
  });

  it("traverses three present episodes and reports only the unpublished next chapter", () => {
    const story = fixture();
    expect(canonicalStoryCoverage(story)).toEqual({
      episodes: 3,
      chapters: 3,
      panels: 3,
      plates: 0,
      resolvedTextPanels: 3,
      unresolvedTextPanels: 0,
      resolvedPlateMappings: 0,
      unresolvedPlateMappings: 0,
      choiceNodes: 0,
      productionReady: false,
      incompleteEpisodeIds: ["E03"],
      continuationPanelIds: ["E03-C2-P02"],
    });

    let cursor = initialCanonicalStoryCursor(story).cursor;
    expect(cursor.panelId).toBe("E01-C1-P01");
    const second = advanceCanonicalStory(story, cursor);
    expect(second.kind).toBe("panel");
    if (second.kind !== "panel") throw new Error("Expected Episode 2.");
    cursor = second.cursor;
    expect(cursor.panelId).toBe("E02-C1-P01");
    const third = advanceCanonicalStory(story, cursor);
    expect(third.kind).toBe("panel");
    if (third.kind !== "panel") throw new Error("Expected Episode 3.");
    cursor = third.cursor;
    expect(cursor.panelId).toBe("E03-C1-P01");
    expect(advanceCanonicalStory(story, cursor)).toEqual({
      kind: "extent-complete",
      cursor,
      continuationPanelId: "E03-C2-P02",
    });
  });
});
