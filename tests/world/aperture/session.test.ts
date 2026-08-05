import { describe, expect, it } from "vitest";
import {
  APERTURE_HOST_SESSION_FORMAT,
  apertureHostSessionKey,
  clearApertureHostSession,
  initialApertureHostSession,
  loadApertureHostSession,
  saveApertureHostSession,
  validateApertureHostSession,
  type ApertureHostSessionStorage,
} from "../../../src/world/aperture/session.js";
import {
  STORY_PACKAGE_DIGEST,
  VIEWER_PROFILE_DIGEST,
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

const scope = {
  storyPackageDigest: STORY_PACKAGE_DIGEST,
  viewerProfileDigest: VIEWER_PROFILE_DIGEST,
};

describe("ApertureHost digest-scoped presentation session", () => {
  it("stores only the selected read-only surface under exact package and viewer digests", () => {
    const storage = new MemoryStorage();
    const session = initialApertureHostSession(scope, "answer");
    saveApertureHostSession(storage, session);

    const key = apertureHostSessionKey(scope);
    expect(key).toContain(STORY_PACKAGE_DIGEST);
    expect(key).toContain(VIEWER_PROFILE_DIGEST);
    expect(JSON.parse(storage.getItem(key)!)).toEqual({
      format: APERTURE_HOST_SESSION_FORMAT,
      storyPackageDigest: STORY_PACKAGE_DIGEST,
      viewerProfileDigest: VIEWER_PROFILE_DIGEST,
      activeSurface: "answer",
    });
    expect(loadApertureHostSession(storage, scope, ["position", "answer", "provenance"]))
      .toMatchObject({ restoration: "restored", reason: "none", session: { activeSurface: "answer" } });
  });

  it("does not recover a presentation session across package or viewer scope", () => {
    const storage = new MemoryStorage();
    saveApertureHostSession(storage, initialApertureHostSession(scope, "selection"));

    const otherPackage = { ...scope, storyPackageDigest: "1".repeat(64) };
    const otherViewer = { ...scope, viewerProfileDigest: "2".repeat(64) };
    expect(loadApertureHostSession(storage, otherPackage, ["position", "selection"]))
      .toMatchObject({ restoration: "fresh", session: { activeSurface: "position" } });
    expect(loadApertureHostSession(storage, otherViewer, ["position", "selection"]))
      .toMatchObject({ restoration: "fresh", session: { activeSurface: "position" } });
  });

  it("resets malformed, foreign, and unavailable-surface sessions visibly", () => {
    const storage = new MemoryStorage();
    const key = apertureHostSessionKey(scope);

    storage.setItem(key, "{");
    expect(loadApertureHostSession(storage, scope, ["position", "provenance"]))
      .toMatchObject({ restoration: "reset", reason: "invalid-json" });

    storage.setItem(key, JSON.stringify({
      format: APERTURE_HOST_SESSION_FORMAT,
      storyPackageDigest: "3".repeat(64),
      viewerProfileDigest: VIEWER_PROFILE_DIGEST,
      activeSurface: "position",
    }));
    expect(loadApertureHostSession(storage, scope, ["position", "provenance"]))
      .toMatchObject({ restoration: "reset", reason: "scope-mismatch" });

    storage.setItem(key, JSON.stringify(initialApertureHostSession(scope, "answer")));
    expect(loadApertureHostSession(storage, scope, ["position", "provenance"]))
      .toMatchObject({ restoration: "reset", reason: "surface-unavailable", session: { activeSurface: "position" } });
  });

  it("refuses unknown session fields and invalid digest scopes", () => {
    expect(validateApertureHostSession({
      ...initialApertureHostSession(scope),
      anchorId: "World must not store daemon state",
    }, scope, ["position", "provenance"])).toBeNull();
    expect(() => apertureHostSessionKey({
      storyPackageDigest: "not-a-digest",
      viewerProfileDigest: VIEWER_PROFILE_DIGEST,
    })).toThrow(/exact SHA-256/);
  });

  it("clears only the exact digest-scoped presentation record", () => {
    const storage = new MemoryStorage();
    saveApertureHostSession(storage, initialApertureHostSession(scope));
    clearApertureHostSession(storage, scope);
    expect(storage.values.size).toBe(0);
  });
});
