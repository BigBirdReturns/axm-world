import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canonicalStoryDigest } from "../../src/canonical-story/digest.js";
import {
  CANONICAL_STORY_EXTENSION_KEY,
  parseCanonicalStory,
  type CanonicalStorySource,
} from "../../src/canonical-story/index.js";
import {
  CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY,
  CANONICAL_STORY_TIMED_MEDIA_FORMAT,
  type CanonicalStoryTimedMedia,
} from "../../src/canonical-story/timed-media.js";
import type { Arc, JsonValue } from "../../src/engine/types.js";
import type { Cartridge } from "../../src/world/cartridge.js";
import { WorldHost } from "../../src/world/WorldHost.js";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
});

afterEach(() => {
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  } else {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});

function storyFixture(): CanonicalStorySource {
  return parseCanonicalStory({
    format: "axm-canonical-story/1",
    identity: {
      id: "story:host-fixture",
      title: "Host Fixture Story",
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
        terminalPanelId: "panel:1",
        previousPanelId: null,
        nextPanelId: null,
        panels: [{
          id: "panel:1",
          ordinal: 1,
          chapterId: "chapter:1",
          previousPanelId: null,
          nextPanelId: null,
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
            altText: "One canonical panel.",
          },
        }],
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
      sha256: "c".repeat(64),
      locator: "fixture:reviewed-source",
      standing: "reviewed-primary",
    }],
    positions: [{
      id: "position:entry",
      episodeId: "episode:1",
      chapterId: "chapter:1",
      panelIds: ["panel:1"],
      canonicalStartUs: 0,
      canonicalEndUs: 5_000_000,
      label: "Entry",
      sourceReceiptIds: ["receipt:reviewed"],
    }],
    facts: [{
      id: "fact:entry",
      proposition: "The courier enters.",
      subjectIds: ["character:courier"],
      sourceReceiptIds: ["receipt:reviewed"],
    }],
    causalEdges: [],
    reveals: [{
      id: "reveal:entry",
      factId: "fact:entry",
      positionId: "position:entry",
      mode: "seen",
      sourceReceiptIds: ["receipt:reviewed"],
    }],
  };
}

function cartridgeFor(extensions: Record<string, JsonValue>): Cartridge {
  const arc = {
    meta: {
      id: "arc:host-fixture",
      name: "Host Fixture",
      domain: "test",
      engineVersion: "1.1.0",
    },
    extensions,
  } as unknown as Arc;

  return {
    manifest: {
      cartridgeVersion: 1,
      id: "arc:host-fixture",
      name: "Host Fixture",
      domain: "test",
      engineVersion: "1.1.0",
      trust: "imported-unsigned",
      signature: null,
    },
    arc,
  };
}

function renderWorld(cartridge: Cartridge): string {
  return renderToStaticMarkup(createElement(WorldHost, {
    cartridge,
    onExit: () => undefined,
  }));
}

describe("WorldHost Aperture timed-media composition", () => {
  it("renders the reviewed projection inside the real fixed-path reader", () => {
    const story = storyFixture();
    const timedMedia = timedMediaFixture(story);
    const html = renderWorld(cartridgeFor({
      [CANONICAL_STORY_EXTENSION_KEY]: story as unknown as JsonValue,
      [CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY]: timedMedia as unknown as JsonValue,
    }));

    expect(html).toContain('data-testid="canonical-story-host"');
    expect(html).toContain('data-panel-id="panel:1"');
    expect(html).toContain('data-testid="aperture-timed-media-projection"');
    expect(html).toContain("The courier enters.");
    expect(html).toContain("provider clock: none");
    expect(html).not.toContain('data-testid="engine-shell"');
  });

  it("refuses a substituted story digest before the reader renders", () => {
    const story = storyFixture();
    const timedMedia = timedMediaFixture(story);
    timedMedia.storyDigest = "d".repeat(64);
    const html = renderWorld(cartridgeFor({
      [CANONICAL_STORY_EXTENSION_KEY]: story as unknown as JsonValue,
      [CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY]: timedMedia as unknown as JsonValue,
    }));

    expect(html).toContain('data-testid="invalid-aperture-timed-media"');
    expect(html).toContain("different canonical story digest");
    expect(html).not.toContain('data-testid="canonical-story-host"');
    expect(html).not.toContain('data-testid="engine-shell"');
  });

  it("refuses orphan timed media instead of founding a simulation", () => {
    const story = storyFixture();
    const timedMedia = timedMediaFixture(story);
    const html = renderWorld(cartridgeFor({
      [CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY]: timedMedia as unknown as JsonValue,
    }));

    expect(html).toContain('data-testid="invalid-aperture-timed-media"');
    expect(html).toContain("Orphan Aperture timed media refused");
    expect(html).not.toContain('data-testid="canonical-story-host"');
    expect(html).not.toContain('data-testid="engine-shell"');
  });
});
