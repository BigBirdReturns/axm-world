import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApertureHost } from "../../../src/world/aperture/ApertureHost.js";
import {
  apertureHostSessionKey,
  initialApertureHostSession,
  type ApertureHostSessionStorage,
} from "../../../src/world/aperture/session.js";
import {
  STORY_PACKAGE_DIGEST,
  VIEWER_PROFILE_DIGEST,
  daemonProjectionFixture,
  storyFixture,
  timedMediaFixture,
} from "./fixtures.js";

class MemoryStorage implements ApertureHostSessionStorage {
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

function render(projection: unknown, storage: ApertureHostSessionStorage | null = null): string {
  const story = storyFixture();
  return renderToStaticMarkup(createElement(ApertureHost, {
    story,
    timedMedia: timedMediaFixture(story),
    daemonProjection: projection,
    storage,
  }));
}

describe("ApertureHost read-only viewer surface", () => {
  it("renders ready anchor coordinates without a daemon command surface", () => {
    const html = render(daemonProjectionFixture());
    expect(html).toContain('data-testid="aperture-host"');
    expect(html).toContain('data-daemon-state="ready"');
    expect(html).toContain('data-active-surface="position"');
    expect(html).toContain("Canonical 0:02");
    expect(html).toContain("External daemon projection");
    expect(html).toContain("no ledger or playback authority");
    expect(html).not.toContain("Seek now");
    expect(html).not.toContain("Play now");
    expect(html).not.toContain("Explain now");
  });

  it("renders daemon absence without creating a digest-scoped session", () => {
    const storage = new MemoryStorage();
    const story = storyFixture();
    const html = renderToStaticMarkup(createElement(ApertureHost, {
      story,
      timedMedia: timedMediaFixture(story),
      storage,
    }));
    expect(html).toContain('data-daemon-state="unavailable"');
    expect(html).toContain("This state creates no ApertureHost session");
    expect(storage.values.size).toBe(0);
  });

  it("restores only a valid read-only surface for the exact package and viewer", () => {
    const storage = new MemoryStorage();
    const scope = {
      storyPackageDigest: STORY_PACKAGE_DIGEST,
      viewerProfileDigest: VIEWER_PROFILE_DIGEST,
    };
    storage.setItem(
      apertureHostSessionKey(scope),
      JSON.stringify(initialApertureHostSession(scope, "answer")),
    );
    const html = render(daemonProjectionFixture(), storage);
    expect(html).toContain('data-session-restoration="restored"');
    expect(html).toContain('data-active-surface="answer"');
    expect(html).toContain('data-testid="aperture-host-answer"');
    expect(html).toContain("2 delivered facts");
    expect(html).toContain("World displays coordinates only");
  });

  it("visibly resets a session whose selected surface is no longer supplied", () => {
    const storage = new MemoryStorage();
    const scope = {
      storyPackageDigest: STORY_PACKAGE_DIGEST,
      viewerProfileDigest: VIEWER_PROFILE_DIGEST,
    };
    storage.setItem(
      apertureHostSessionKey(scope),
      JSON.stringify(initialApertureHostSession(scope, "selection")),
    );
    const projection = daemonProjectionFixture();
    projection.selection = null;
    const html = render(projection, storage);
    expect(html).toContain('data-session-restoration="reset"');
    expect(html).toContain('data-testid="aperture-host-session-reset"');
    expect(html).toContain('data-active-surface="position"');
  });

  it("renders every declared degraded state with a distinct machine value and label", () => {
    const expected = {
      partial: "Partial coordinates",
      stale: "Stale coordinates",
      ambiguous: "Ambiguous anchor",
      conflict: "Conflicting evidence",
      refused: "Daemon projection refused",
      unavailable: "Daemon unavailable",
      unsupported: "Unsupported daemon state",
    } as const;
    for (const [state, label] of Object.entries(expected)) {
      const html = render(daemonProjectionFixture(storyFixture(), state as keyof typeof expected));
      expect(html).toContain(`data-daemon-state="${state}"`);
      expect(html).toContain(label);
      expect(html).toContain('data-testid="aperture-host-degradation"');
    }
  });

  it("refuses a substituted package projection while retaining explicit error text", () => {
    const projection = daemonProjectionFixture();
    projection.canonical_story_digest = "0".repeat(64);
    const html = render(projection);
    expect(html).toContain('data-testid="aperture-host-refusal"');
    expect(html).toContain("canonical_story_digest does not match the verified canonical story");
    expect(html).toContain("World did not repair, store, or act on this projection");
  });
});
