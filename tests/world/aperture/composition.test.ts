import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cartridgeIdentity } from "../../../src/world/cartridge-identity.js";
import {
  CANONICAL_STORY_SESSION_FORMAT,
  canonicalStorySessionKey,
} from "../../../src/world/sequence/session.js";
import { WorldHost } from "../../../src/world/WorldHost.js";
import {
  cartridgeFixture,
  daemonProjectionFixture,
  storyFixture,
  timedMediaFixture,
} from "./fixtures.js";

class MemoryStorage {
  readonly values = new Map<string, string>();

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
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
});

afterEach(() => {
  if (originalLocalStorage) Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

function renderWorld(projection?: unknown): string {
  const story = storyFixture();
  const cartridge = cartridgeFixture(story, timedMediaFixture(story));
  return renderToStaticMarkup(createElement(WorldHost, {
    cartridge,
    apertureDaemonProjection: projection,
    onExit: () => undefined,
  }));
}

describe("WorldHost fixed-story ApertureHost composition", () => {
  it("mounts Arc position and external daemon coordinates inside the same fixed reader", () => {
    const html = renderWorld(daemonProjectionFixture());
    expect(html).toContain('data-testid="canonical-story-host"');
    expect(html).toContain('data-testid="aperture-timed-media-projection"');
    expect(html).toContain('data-testid="aperture-host"');
    expect(html).toContain('data-daemon-state="ready"');
    expect(html).not.toContain('data-testid="engine-shell"');
  });

  it("keeps Arc-reviewed context available when the external daemon is absent", () => {
    const html = renderWorld();
    expect(html).toContain('data-testid="aperture-timed-media-projection"');
    expect(html).toContain('data-daemon-state="unavailable"');
    expect(html).toContain("The courier enters.");
  });

  it("refuses daemon substitution inside the reader without converting it into simulation", () => {
    const projection = daemonProjectionFixture();
    projection.canonical_story_id = "story:foreign";
    const html = renderWorld(projection);
    expect(html).toContain('data-testid="canonical-story-host"');
    expect(html).toContain('data-testid="aperture-host-refusal"');
    expect(html).not.toContain('data-testid="engine-shell"');
  });

  it("preserves the existing digest-bound SequenceHost cursor independently of daemon state", () => {
    const story = storyFixture();
    const cartridge = cartridgeFixture(story, timedMediaFixture(story));
    const digest = cartridgeIdentity(cartridge);
    storage.setItem(canonicalStorySessionKey(digest), JSON.stringify({
      format: CANONICAL_STORY_SESSION_FORMAT,
      authoredArcDigest: digest,
      cursor: {
        format: "axm-canonical-story-cursor/1",
        storyId: story.identity.id,
        episodeId: "episode:1",
        chapterId: "chapter:1",
        panelId: "panel:2",
      },
    }));

    const html = renderToStaticMarkup(createElement(WorldHost, {
      cartridge,
      apertureDaemonProjection: daemonProjectionFixture(story),
      onExit: () => undefined,
    }));
    expect(html).toContain('data-panel-id="panel:2"');
    expect(html).toContain("The map changes hands.");
    expect(html).toContain('data-testid="aperture-host"');
  });
});
