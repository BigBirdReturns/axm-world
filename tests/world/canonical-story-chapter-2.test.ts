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
    identity: { id: "two-chapter-story", title: "Two Chapters", version: "0.2.0" },
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
      complete: false,
      nextChapterId: "E01-C3",
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
      ],
    }],
  });
}

describe("World multi-chapter canonical-story law", () => {
  it("traverses a present chapter seam in both directions", () => {
    const story = fixture();
    const terminal = canonicalStoryCursorForPanel(story, "E01-C1-P02");
    const forward = advanceCanonicalStory(story, terminal);
    expect(forward.kind).toBe("panel");
    if (forward.kind !== "panel") throw new Error("Expected a present Chapter 2 panel.");
    expect(forward.cursor).toMatchObject({
      chapterId: "E01-C2",
      panelId: "E01-C2-P03",
    });
    expect(forward.receipt).toMatchObject({
      fromPanelId: "E01-C1-P02",
      toPanelId: "E01-C2-P03",
      chapterId: "E01-C2",
    });

    const reverse = retreatCanonicalStory(story, forward.cursor);
    expect(reverse.kind).toBe("panel");
    if (reverse.kind === "panel") {
      expect(reverse.cursor).toMatchObject({
        chapterId: "E01-C1",
        panelId: "E01-C1-P02",
      });
    }
  });

  it("reports only the continuation whose target is outside the published extent", () => {
    const story = fixture();
    expect(canonicalStoryCoverage(story)).toMatchObject({
      chapters: 2,
      panels: 4,
      continuationPanelIds: ["E01-C3-P05"],
    });
    const terminal = canonicalStoryCursorForPanel(story, "E01-C2-P04");
    expect(advanceCanonicalStory(story, terminal)).toEqual({
      kind: "extent-complete",
      cursor: terminal,
      continuationPanelId: "E01-C3-P05",
    });
  });
});
