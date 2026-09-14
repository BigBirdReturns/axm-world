import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUNDLED_CARTRIDGES, parseCartridge } from "../../src/world/cartridge.js";
import { WorldHost } from "../../src/world/WorldHost.js";
import { resolveRuntimeHost, selectRuntimeHost } from "../../src/world/runtime/host-registry.js";
import { readRuntimeFamilyContract } from "../../src/engine/runtime-family.js";
import { CANONICAL_STORY_EXTENSION_KEY } from "../../src/canonical-story/index.js";
import { CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY } from "../../src/canonical-story/timed-media.js";
import { cartridgeFixture, storyFixture, timedMediaFixture } from "./aperture/fixtures.js";

const cleanRoom = parseCartridge(JSON.parse(readFileSync(new URL("../../cartridges/clean-room/orchard-at-low-tide.arc.json", import.meta.url), "utf8")));

describe("runtime host registry", () => {
  it("selects deterministically regardless of capability order or duplication", () => {
    expect(selectRuntimeHost(["simulation"])).toBe("simulation");
    for (const requirements of [
      ["canonical-story", "canonical-story.timed-media"],
      ["canonical-story.timed-media", "canonical-story"],
      ["canonical-story", "canonical-story", "canonical-story.timed-media"],
    ]) expect(selectRuntimeHost(requirements)).toBe("canonical-story");
  });

  it("refuses empty, unknown, orphan, and incompatible requirements", () => {
    for (const requirements of [[], ["future-runtime"], ["simulation", "future-runtime"],
      ["simulation", "canonical-story"], ["canonical-story.timed-media"],
    ]) expect(selectRuntimeHost(requirements)).toBeNull();
  });

  it("routes every bundled and clean-room cartridge by authored runtime family without changing law", () => {
    for (const cartridge of [...BUNDLED_CARTRIDGES, cleanRoom]) {
      const before = JSON.stringify(cartridge);
      const family = readRuntimeFamilyContract(cartridge.arc)?.family ?? null;
      const expectedHost = family === "strategy-board" ? "strategy-board" : "simulation";
      const resolved = resolveRuntimeHost(cartridge.arc);
      expect(resolved).toMatchObject({ ok: true, selection: { host: expectedHost } });
      expect(resolveRuntimeHost(structuredClone(cartridge.arc))).toEqual(resolved);
      expect(JSON.stringify(cartridge)).toBe(before);
      const renamed = structuredClone(cartridge.arc);
      renamed.meta.id = "unregistered-runtime-proof";
      expect(resolveRuntimeHost(renamed)).toEqual(resolved);
    }
  });

  it("keeps story precedence and validated timed media without changing authority", () => {
    const story = storyFixture();
    for (const timedMedia of [null, timedMediaFixture(story)]) {
      const cartridge = cartridgeFixture(story, timedMedia ?? undefined);
      if (!timedMedia) delete cartridge.arc.extensions![CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY];
      const before = JSON.stringify(cartridge.arc);
      expect(resolveRuntimeHost(cartridge.arc)).toEqual({ ok: true, selection: { host: "canonical-story", story, timedMedia } });
      expect(JSON.stringify(cartridge.arc)).toBe(before);
    }
  });

  it("preserves story, malformed timed-media, and orphan refusal boundaries", () => {
    const story = storyFixture();
    const cartridge = cartridgeFixture(story, timedMediaFixture(story));
    for (const [extension, expected] of [
      [CANONICAL_STORY_EXTENSION_KEY, "invalid-canonical-story"],
      [CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY, "invalid-aperture-timed-media"],
    ] as const) {
      const arc = structuredClone(cartridge.arc);
      arc.extensions![extension] = {};
      expect(resolveRuntimeHost(arc)).toMatchObject({ ok: false, refusal: { testId: expected } });
    }
    delete cartridge.arc.extensions![CANONICAL_STORY_EXTENSION_KEY];
    expect(resolveRuntimeHost(cartridge.arc)).toMatchObject({ ok: false, refusal: { testId: "invalid-aperture-timed-media" } });
  });

  it("refuses unsupported runtime versions and incompatible simulation before mounting state", () => {
    const unsupported = structuredClone(cleanRoom);
    unsupported.arc.extensions = { "axm.canonical-story@99": {} };
    const incompatible = structuredClone(cleanRoom);
    incompatible.arc.meta.engineVersion = "999.0.0";
    const malformed = structuredClone(cleanRoom);
    malformed.arc.roles = [];
    for (const cartridge of [unsupported, incompatible, malformed]) {
      expect(resolveRuntimeHost(cartridge.arc)).toMatchObject({ ok: false, refusal: { testId: "invalid-runtime-capability" } });
      const html = renderToStaticMarkup(createElement(WorldHost, { cartridge, onExit: () => undefined }));
      expect(html).toContain('data-testid="invalid-runtime-capability"');
      expect(html).not.toContain('data-testid="engine-shell"');
    }
  });

  it("keeps unknown authored metadata opaque and refusal order stable", () => {
    const arc = structuredClone(cleanRoom.arc);
    arc.extensions = { ...arc.extensions, "creator.notes@9": { note: "portable" } };
    expect(resolveRuntimeHost(arc)).toEqual({ ok: true, selection: { host: "simulation" } });
    arc.extensions = { "axm.canonical-story@9": {}, "axm.canonical-story.timed-media@9": {} };
    const expected = resolveRuntimeHost(arc);
    arc.extensions = Object.fromEntries(Object.entries(arc.extensions).reverse());
    expect(resolveRuntimeHost(arc)).toEqual(expected);
  });

  it("keeps concrete cartridge identities out of runtime dispatch source", () => {
    const dir = new URL("../../src/world/runtime/", import.meta.url);
    const source = readFileSync(new URL("../../src/world/WorldHost.tsx", import.meta.url), "utf8")
      + readdirSync(dir).filter((name) => /\.tsx?$/.test(name)).map((name) => readFileSync(new URL(name, dir), "utf8")).join("\n");
    for (const cartridge of [...BUNDLED_CARTRIDGES, cleanRoom]) expect(source).not.toContain(cartridge.arc.meta.id);
    expect(source).not.toMatch(/(?:arc|manifest)\.meta?\.?id\s*===/);
    expect(source).not.toMatch(/from ["'].*\/arcs\//);
  });
});
