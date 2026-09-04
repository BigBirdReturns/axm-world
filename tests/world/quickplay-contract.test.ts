import { describe, expect, it } from "vitest";
import { QUICKPLAY_BASE_ACTIONS, QuickPlayCartridgeSchema } from "../../src/quickplay/contracts.js";

const digest = "a".repeat(64);

describe("QuickPlay cartridge", () => {
  it("admits a self-contained offline web game without ARC promotion", () => {
    const cartridge = QuickPlayCartridgeSchema.parse({
      format: "axm-quickplay-cartridge/0",
      id: "tiny-planet-001",
      title: "Tiny Planet",
      entry: "game.html",
      engine: { kind: "web", template: "threejs" },
      law: { mode: "self-contained" },
      controls: { actions: QUICKPLAY_BASE_ACTIONS },
      capabilities: {
        network: false,
        storage: "host",
        audio: true,
        fullscreen: true,
        pointerLock: true,
      },
      provenance: {
        promptSha256: digest,
        sourceSha256: digest,
        buildSha256: digest,
        builder: "opengame-sidecar",
        provider: "provider-under-test",
      },
    });

    expect(cartridge.law.mode).toBe("self-contained");
    expect(cartridge.capabilities.network).toBe(false);
    expect(cartridge.entry).toBe("game.html");
    expect(cartridge.controls.actions.some((action) => action.id === "primary")).toBe(true);
  });

  it("refuses generated games that request network authority", () => {
    expect(() => QuickPlayCartridgeSchema.parse({
      format: "axm-quickplay-cartridge/0",
      id: "bad-game",
      title: "Bad Game",
      entry: "game.html",
      engine: { kind: "web", template: "threejs" },
      law: { mode: "self-contained" },
      controls: { actions: QUICKPLAY_BASE_ACTIONS },
      capabilities: {
        network: true,
        storage: "host",
        audio: false,
        fullscreen: true,
        pointerLock: false,
      },
      provenance: {
        promptSha256: digest,
        sourceSha256: digest,
        buildSha256: digest,
        builder: "opengame-sidecar",
        provider: "provider-under-test",
      },
    })).toThrow();
  });
});
