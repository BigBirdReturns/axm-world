import { canonicalStoryDigest } from "../../../src/canonical-story/digest.js";
import {
  CANONICAL_STORY_EXTENSION_KEY,
  parseCanonicalStory,
  type CanonicalStorySource,
} from "../../../src/canonical-story/index.js";
import {
  CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY,
  CANONICAL_STORY_TIMED_MEDIA_FORMAT,
  type CanonicalStoryTimedMedia,
} from "../../../src/canonical-story/timed-media.js";
import type { Arc, JsonValue } from "../../../src/engine/types.js";
import type {
  ApertureDaemonProjection,
  ApertureDaemonState,
} from "../../../src/world/aperture/ApertureHost.js";
import type { Cartridge } from "../../../src/world/cartridge.js";

export const STORY_PACKAGE_DIGEST = "d".repeat(64);
export const VIEWER_PROFILE_DIGEST = "e".repeat(64);
export const PROJECTION_DIGEST = "f".repeat(64);
export const ANCHOR_ID = `anchor1_${"1".repeat(64)}`;
export const PLAN_ID = `answerplan1_${"2".repeat(64)}`;
export const ANSWER_RECEIPT_ID = `answerreceipt1_${"3".repeat(64)}`;
export const SELECTION_ID = `selection1_${"4".repeat(64)}`;

export function storyFixture(): CanonicalStorySource {
  return parseCanonicalStory({
    format: "axm-canonical-story/1",
    identity: {
      id: "story:aperture-host-fixture",
      title: "Aperture Host Fixture",
      version: "0.1.0",
    },
    sourcePlane: {
      format: "fixture-story/1",
      extensionKey: "fixture.story@1",
    },
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
              sha256: "b".repeat(64),
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
              altText: "Panel two.",
            },
          },
        ],
        plates: [],
      }],
    }],
  });
}

export function timedMediaFixture(story = storyFixture()): CanonicalStoryTimedMedia {
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
      sha256: "9".repeat(64),
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

export function daemonProjectionFixture(
  story = storyFixture(),
  state: ApertureDaemonState = "ready",
): ApertureDaemonProjection {
  const scoped = state !== "unavailable" && state !== "unsupported";
  return {
    format: "axm-aperture-world-projection/1",
    authority: "external_daemon_projection_only",
    state,
    observed_at_us: 1_700_000_000_000_000,
    canonical_story_id: scoped ? story.identity.id : null,
    canonical_story_digest: scoped ? canonicalStoryDigest(story) : null,
    story_package_id: scoped ? "story.golden" : null,
    story_package_digest: scoped ? STORY_PACKAGE_DIGEST : null,
    viewer_profile_id: scoped ? "viewer.local" : null,
    viewer_profile_digest: scoped ? VIEWER_PROFILE_DIGEST : null,
    continuity_id: scoped ? "continuity.golden" : null,
    work_id: scoped ? "work.golden" : null,
    anchor: scoped ? {
      format: "axm-aperture-world-anchor-coordinate/1",
      source_format: "axm-aperture-playback-anchor/1",
      source_authority: "resolved_playback_state_only",
      anchor_id: ANCHOR_ID,
      state: state === "ambiguous" ? "ambiguous"
        : state === "conflict" ? "conflict"
          : state === "stale" ? "stale"
            : state === "refused" ? "refused"
              : state === "partial" ? "unbound"
                : "resolved",
      work_id: "work.golden",
      edition_id: state === "partial" ? null : "edition.golden.a",
      identity_standing: state === "partial" ? "nominated" : "verified",
      identity_confidence_ppm: state === "partial" ? 500_000 : 1_000_000,
      clock: {
        state: "playing",
        canonical_position_us: state === "partial" ? null : 2_000_000,
        provider_position_us: 2_000_000,
        duration_us: 20_000_000,
        rate_numerator: 1,
        rate_denominator: 1,
        mode: state === "partial" ? "session" : "direct",
        confidence_ppm: state === "partial" ? 500_000 : 1_000_000,
        precision_us: 1000,
        observed_at_us: 1_000_000,
      },
      anchor_digest: "5".repeat(64),
    } : null,
    answer: scoped ? {
      format: "axm-aperture-world-answer-coordinate/1",
      source_plan_format: "axm-aperture-answer-plan/1",
      source_receipt_format: "axm-aperture-answer-receipt/1",
      plan_id: PLAN_ID,
      receipt_id: ANSWER_RECEIPT_ID,
      story_package_id: "story.golden",
      anchor_id: ANCHOR_ID,
      story_digest: canonicalStoryDigest(story),
      delivered_fact_count: 2,
      withheld_fact_count: 1,
      knowledge_event_count: 1,
      plan_digest: "6".repeat(64),
      receipt_digest: "7".repeat(64),
    } : null,
    selection: scoped ? {
      format: "axm-aperture-world-selection-coordinate/1",
      source_format: "axm-aperture-selection-receipt/1",
      source_authority: "selection_receipt_only",
      selection_id: SELECTION_ID,
      story_package_id: "story.golden",
      work_id: "work.golden",
      mode: "bridge",
      selected_candidate_id: "candidate:bridge",
      scene_id: "scene:bridge",
      canonical_start_us: 6_000_000,
      canonical_end_us: 8_000_000,
      candidate_count: 7,
      reason_codes: ["same_work", "resolves_current_conflict"],
      same_work_only: true,
      selection_digest: "8".repeat(64),
    } : null,
    access_receipt_ids: scoped ? ["access1_fixture"] : [],
    state_codes: state === "ready" ? [] : [`daemon_${state}`],
    projection_digest: PROJECTION_DIGEST,
  };
}

export function cartridgeFixture(
  story = storyFixture(),
  timedMedia = timedMediaFixture(story),
): Cartridge {
  const arc = {
    meta: {
      id: "arc:aperture-host-fixture",
      name: "Aperture Host Fixture",
      domain: "test",
      engineVersion: "1.1.0",
    },
    extensions: {
      [CANONICAL_STORY_EXTENSION_KEY]: story as unknown as JsonValue,
      [CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY]: timedMedia as unknown as JsonValue,
    },
  } as unknown as Arc;
  return {
    manifest: {
      cartridgeVersion: 1,
      id: "arc:aperture-host-fixture",
      name: "Aperture Host Fixture",
      domain: "test",
      engineVersion: "1.1.0",
      trust: "imported-unsigned",
      signature: null,
    },
    arc,
  };
}
