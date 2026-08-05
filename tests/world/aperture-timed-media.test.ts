import { describe, expect, it } from "vitest";
import { canonicalStoryDigest } from "../../src/canonical-story/digest.js";
import {
  parseCanonicalStory,
  type CanonicalStorySource,
} from "../../src/canonical-story/index.js";
import {
  CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY,
  CANONICAL_STORY_TIMED_MEDIA_FORMAT,
  type CanonicalStoryTimedMedia,
} from "../../src/canonical-story/timed-media.js";
import type { Arc } from "../../src/engine/types.js";
import {
  arcCarriesApertureTimedMedia,
  readApertureTimedMediaForStory,
} from "../../src/world/timed-media/receiver.js";
import { projectApertureAtPanel } from "../../src/world/timed-media/projection.js";

const SOURCE_SHA = "b".repeat(64);

function storyFixture(): CanonicalStorySource {
  return parseCanonicalStory({
    format: "axm-canonical-story/1",
    identity: { id: "story:fixture", title: "Fixture Story", version: "0.1.0" },
    sourcePlane: { format: "fixture-story/1", extensionKey: "fixture.story@1" },
    authority: {
      pathPolicy: "canonical-fixed",
      choicePolicy: "none",
      textAuthority: "exact-source-required",
      assetAuthority: "external-manifest",
    },
    sourceReceipts: [{
      id: "story-source",
      path: "source/fixture.json",
      bytes: 1,
      sha256: "a".repeat(64),
      role: "canonical-source",
      available: true,
    }],
    episodes: [{
      id: "episode:1",
      number: 1,
      title: "Fixture Episode",
      complete: true,
      nextChapterId: null,
      chapters: [{
        id: "chapter:1",
        number: 1,
        title: "Fixture Chapter",
        complete: true,
        openingPanelId: "panel:1",
        terminalPanelId: "panel:2",
        previousPanelId: null,
        nextPanelId: null,
        panels: [
          {
            id: "panel:1",
            ordinal: 1,
            chapterId: "chapter:1",
            previousPanelId: null,
            nextPanelId: "panel:2",
            asset: {
              id: "asset:1",
              path: "assets/panel-1.webp",
              bytes: 1,
              sha256: "c".repeat(64),
              mimeType: "image/webp",
              availability: "manifested-external",
              visualStanding: "accepted",
            },
            text: {
              status: "resolved",
              sourceReceiptIds: ["story-source"],
              captions: [],
              dialogue: [],
              soundEffects: [],
              altText: "Panel one.",
            },
          },
          {
            id: "panel:2",
            ordinal: 2,
            chapterId: "chapter:1",
            previousPanelId: "panel:1",
            nextPanelId: null,
            asset: {
              id: "asset:2",
              path: "assets/panel-2.webp",
              bytes: 1,
              sha256: "d".repeat(64),
              mimeType: "image/webp",
              availability: "manifested-external",
              visualStanding: "accepted",
            },
            text: {
              status: "resolved",
              sourceReceiptIds: ["story-source"],
              captions: [],
              dialogue: [],
              soundEffects: [],
              altText: "Panel two.",
            },
          },
        ],
        plates: [],
      }],
    }],
  });
}

function timedMediaFixture(story: CanonicalStorySource): CanonicalStoryTimedMedia {
  return {
    format: CANONICAL_STORY_TIMED_MEDIA_FORMAT,
    storyId: story.identity.id,
    storyDigest: canonicalStoryDigest(story),
    timeUnit: "microseconds",
    authority: {
      narrative: "arc",
      providerClock: "none",
      viewerState: "none",
      playbackControl: "none",
    },
    sourceReceipts: [{
      id: "receipt:reviewed",
      sha256: SOURCE_SHA,
      locator: "fixture:reviewed-source",
      standing: "reviewed-primary",
    }],
    positions: [
      {
        id: "position:entry",
        episodeId: "episode:1",
        chapterId: "chapter:1",
        panelIds: ["panel:1"],
        canonicalStartUs: 0,
        canonicalEndUs: 5_000_000,
        label: "Entry",
        sourceReceiptIds: ["receipt:reviewed"],
      },
      {
        id: "position:consequence",
        episodeId: "episode:1",
        chapterId: "chapter:1",
        panelIds: ["panel:2"],
        canonicalStartUs: 5_000_000,
        canonicalEndUs: 9_000_000,
        label: "Consequence",
        sourceReceiptIds: ["receipt:reviewed"],
      },
    ],
    facts: [
      {
        id: "fact:entry",
        proposition: "The courier enters.",
        subjectIds: ["character:courier"],
        sourceReceiptIds: ["receipt:reviewed"],
      },
      {
        id: "fact:consequence",
        proposition: "The map changes hands.",
        subjectIds: ["character:courier"],
        sourceReceiptIds: ["receipt:reviewed"],
      },
    ],
    causalEdges: [{
      id: "edge:entry-consequence",
      fromFactId: "fact:entry",
      toFactId: "fact:consequence",
      relation: "necessary-cause",
      sourceReceiptIds: ["receipt:reviewed"],
    }],
    reveals: [
      {
        id: "reveal:entry",
        factId: "fact:entry",
        positionId: "position:entry",
        mode: "seen",
        sourceReceiptIds: ["receipt:reviewed"],
      },
      {
        id: "reveal:consequence",
        factId: "fact:consequence",
        positionId: "position:consequence",
        mode: "seen",
        sourceReceiptIds: ["receipt:reviewed"],
      },
    ],
  };
}

function arcWithTimedMedia(value: unknown): Arc {
  return {
    extensions: { [CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY]: value },
  } as unknown as Arc;
}

describe("World Aperture timed-media receiver", () => {
  it("derives the expected story digest independently and reads the exact extension", () => {
    const story = storyFixture();
    const timedMedia = timedMediaFixture(story);
    const arc = arcWithTimedMedia(timedMedia);

    expect(arcCarriesApertureTimedMedia(arc)).toBe(true);
    expect(readApertureTimedMediaForStory(arc, story)).toEqual(timedMedia);

    const changedStory = structuredClone(story);
    changedStory.identity.title = "Changed Fixture Story";
    expect(canonicalStoryDigest(changedStory)).not.toBe(timedMedia.storyDigest);
  });

  it("projects only records explicitly revealed at the current panel position", () => {
    const timedMedia = timedMediaFixture(storyFixture());
    const entry = projectApertureAtPanel(timedMedia, "panel:1");

    expect(entry?.positions.map((row) => row.id)).toEqual(["position:entry"]);
    expect(entry?.reveals.map((row) => row.id)).toEqual(["reveal:entry"]);
    expect(entry?.facts.map((row) => row.id)).toEqual(["fact:entry"]);
    expect(entry?.causalEdges).toEqual([]);
    expect(entry?.sourceReceipts.map((row) => row.id)).toEqual(["receipt:reviewed"]);
  });

  it("does not infer a projection for an unmapped panel or leak an unrevealed endpoint", () => {
    const timedMedia = timedMediaFixture(storyFixture());
    expect(projectApertureAtPanel(timedMedia, "panel:unmapped")).toBeNull();

    const entry = projectApertureAtPanel(timedMedia, "panel:1");
    expect(entry?.facts.some((fact) => fact.id === "fact:consequence")).toBe(false);
    expect(entry?.causalEdges).toEqual([]);
  });

  it("shows a causal edge only when both endpoint facts are explicitly revealed there", () => {
    const timedMedia = timedMediaFixture(storyFixture());
    timedMedia.reveals.push({
      id: "reveal:consequence-at-entry",
      factId: "fact:consequence",
      positionId: "position:entry",
      mode: "explained",
      sourceReceiptIds: ["receipt:reviewed"],
    });

    const entry = projectApertureAtPanel(timedMedia, "panel:1");
    expect(entry?.facts.map((row) => row.id)).toEqual([
      "fact:entry",
      "fact:consequence",
    ]);
    expect(entry?.causalEdges.map((row) => row.id)).toEqual([
      "edge:entry-consequence",
    ]);
  });

  it("refuses digest substitution and playback-authority leakage", () => {
    const story = storyFixture();

    const substituted = timedMediaFixture(story);
    substituted.storyDigest = "e".repeat(64);
    expect(() => readApertureTimedMediaForStory(
      arcWithTimedMedia(substituted),
      story,
    )).toThrow(/different canonical story digest/);

    const controlling = timedMediaFixture(story) as unknown as {
      authority: { playbackControl: string };
    };
    controlling.authority.playbackControl = "world";
    expect(() => readApertureTimedMediaForStory(
      arcWithTimedMedia(controlling),
      story,
    )).toThrow(/authority\.playbackControl/);
  });

  it("reports absence without inventing a timed-media authority", () => {
    const story = storyFixture();
    const arc = {} as Arc;
    expect(arcCarriesApertureTimedMedia(arc)).toBe(false);
    expect(readApertureTimedMediaForStory(arc, story)).toBeNull();
  });
});
