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
    identity: { id: "complete-episode", title: "Complete Episode", version: "0.3.0" },
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
    episodes: [{
      id: "E01",
      number: 1,
      title: "Episode",
      complete: true,
      nextChapterId: null,
      chapters: [
        chapter(
          "E01-C1",
          1,
          "E01-C1-P01",
          "E01-C1-P02",
          null,
          "E01-C2-P03",
          [
            panel("E01-C1-P01", 1, "E01-C1", null, "E01-C1-P02"),
            panel("E01-C1-P02", 2, "E01-C1", "E01-C1-P01", "E01-C2-P03"),
          ],
        ),
        chapter(
          "E01-C2",
          2,
          "E01-C2-P03",
          "E01-C2-P04",
          "E01-C1-P02",
          "E01-C3-P05",
          [
            panel("E01-C2-P03", 1, "E01-C2", "E01-C1-P02", "E01-C2-P04"),
            panel("E01-C2-P04", 2, "E01-C2", "E01-C2-P03", "E01-C3-P05"),
          ],
        ),
        chapter(
          "E01-C3",
          3,
          "E01-C3-P05",
          "E01-C3-P06",
          "E01-C2-P04",
          "E02-C1-P01",
          [
            panel("E01-C3-P05", 1, "E01-C3", "E01-C2-P04", "E01-C3-P06"),
            panel("E01-C3-P06", 2, "E01-C3", "E01-C3-P05", "E02-C1-P01"),
          ],
        ),
      ],
    }],
  });
}

describe("World complete-episode canonical-story law", () => {
  it("traverses both present chapter seams through one fixed runtime", () => {
    const story = fixture();
    let cursor = canonicalStoryCursorForPanel(story, "E01-C1-P02");
    const firstSeam = advanceCanonicalStory(story, cursor);
    expect(firstSeam.kind).toBe("panel");
    if (firstSeam.kind !== "panel") throw new Error("Chapter 2 was not present.");
    expect(firstSeam.cursor).toMatchObject({
      chapterId: "E01-C2",
      panelId: "E01-C2-P03",
    });

    cursor = canonicalStoryCursorForPanel(story, "E01-C2-P04");
    const secondSeam = advanceCanonicalStory(story, cursor);
    expect(secondSeam.kind).toBe("panel");
    if (secondSeam.kind !== "panel") throw new Error("Chapter 3 was not present.");
    expect(secondSeam.cursor).toMatchObject({
      chapterId: "E01-C3",
      panelId: "E01-C3-P05",
    });

    const reverse = retreatCanonicalStory(story, secondSeam.cursor);
    expect(reverse.kind).toBe("panel");
    if (reverse.kind === "panel") expect(reverse.cursor.panelId).toBe("E01-C2-P04");
  });

  it("distinguishes a complete episode from complete production expression", () => {
    const story = fixture();
    expect(story.episodes[0]).toMatchObject({ complete: true, nextChapterId: null });
    expect(canonicalStoryCoverage(story)).toEqual({
      episodes: 1,
      chapters: 3,
      panels: 6,
      plates: 0,
      resolvedTextPanels: 6,
      unresolvedTextPanels: 0,
      resolvedPlateMappings: 0,
      unresolvedPlateMappings: 0,
      choiceNodes: 0,
      productionReady: true,
      incompleteEpisodeIds: [],
      continuationPanelIds: ["E02-C1-P01"],
    });
  });

  it("emits the Episode 2 continuation only after the terminal panel", () => {
    const story = fixture();
    const terminal = canonicalStoryCursorForPanel(story, "E01-C3-P06");
    expect(advanceCanonicalStory(story, terminal)).toEqual({
      kind: "extent-complete",
      cursor: terminal,
      continuationPanelId: "E02-C1-P01",
    });
  });
});
